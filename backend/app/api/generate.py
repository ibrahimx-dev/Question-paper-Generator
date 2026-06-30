from fastapi import APIRouter
from app.models.schemas import GenerateRequest, SectionSpec
from app.services.ai_client import (
    generate_questions_from_ai,
    pad_section_questions,
    _section_key,
    _truncate_material,
    MAX_MATERIAL_CHARS,
)
from app.db.supabase import fetch_all, insert_rows, insert_row, delete_row, delete_file_from_storage
import json

router = APIRouter()


def check_duplicates(new_questions: list, existing_questions: list) -> list:
    """Filter out questions that are too similar to existing ones."""
    existing_texts = set()
    for q in existing_questions:
        if isinstance(q, dict) and "question_text" in q:
            existing_texts.add(q["question_text"].strip().lower())

    unique = []
    for q in new_questions:
        text = q.get("text", "")
        normalized = text.strip().lower()
        if normalized not in existing_texts:
            unique.append(q)
    return unique


def _sections_to_dicts(sections: list[SectionSpec]) -> list[dict]:
    return [
        {
            "id": s.id,
            "label": s.label,
            "marks_per_question": s.marks_per_question,
            "question_count": s.question_count,
            "answer_count": s.answer_count,
            "question_types": [
                {"type": qt.type, "count": qt.count}
                for qt in (s.question_types or [])
            ],
            # Legacy: keep question_type for backward compat in exports
            "question_type": s.question_types[0].type if s.question_types else (s.question_type or "Short Answer"),
        }
        for s in sections
    ]


@router.post("/generate")
def generate_questions(payload: GenerateRequest):
    section_dicts = _sections_to_dicts(payload.sections)

    # 1. Fetch extracted content for the selected modules
    module_texts = []
    subjects = fetch_all("subjects", {"name": f"eq.{payload.subject}"})
    subject_id = None
    if isinstance(subjects, list) and subjects:
        subject_id = subjects[0]["id"]

    if subject_id:
        all_modules = fetch_all("modules", {"subject_id": f"eq.{subject_id}"})
        if isinstance(all_modules, list):
            for mod in all_modules:
                if mod["name"] in payload.modules:
                    contents = fetch_all("extracted_content", {"module_id": f"eq.{mod['id']}"})
                    if isinstance(contents, list):
                        for c in contents:
                            text = c.get("content_text", "")
                            if text.strip():
                                module_texts.append(text)

    combined_text = "\n\n".join(module_texts) if module_texts else (
        f"Generate questions about {payload.subject} covering topics: {', '.join(payload.modules)}."
    )

    if len(combined_text) > MAX_MATERIAL_CHARS:
        combined_text = _truncate_material(combined_text)

    # 2. Call AI with full section configuration (now multi-type aware)
    result = generate_questions_from_ai(
        text=combined_text,
        subject=payload.subject,
        difficulty=payload.difficulty,
        sections=section_dicts,
    )

    if "error" in result:
        return {
            "questions": result,
            "section_config": section_dicts,
            "duplicates_removed": 0,
            "subject": payload.subject,
            "difficulty": payload.difficulty,
            "exam_header": payload.exam_header,
            "duration": payload.duration,
        }

    # 3. Duplicate detection per section (never reduce below requested count)
    duplicates_removed = 0
    if subject_id:
        existing_qs = fetch_all("generated_questions", {"subject_id": f"eq.{subject_id}"})
        if isinstance(existing_qs, list) and existing_qs:
            for sec in section_dicts:
                key = _section_key(sec["id"])
                if key not in result:
                    continue
                original = list(result[key])
                result[key] = check_duplicates(result[key], existing_qs)
                if len(result[key]) < sec["question_count"]:
                    unique_texts = {q.get("text", "").strip().lower() for q in result[key]}
                    for q in original:
                        if len(result[key]) >= sec["question_count"]:
                            break
                        norm = q.get("text", "").strip().lower()
                        if norm not in unique_texts:
                            result[key].append(q)
                            unique_texts.add(norm)
                duplicates_removed += len(original) - len(result.get(key, []))

    # 4. Trim/pad to exact question_count per section
    for sec in section_dicts:
        key = _section_key(sec["id"])
        questions = result.get(key, [])
        if len(questions) > sec["question_count"]:
            result[key] = questions[: sec["question_count"]]
        elif len(questions) < sec["question_count"]:
            result[key] = pad_section_questions(questions, sec["question_count"], sec)

    # 5. Save to DB
    if subject_id:
        questions_to_save = []
        module_id_map = {}
        all_mods = fetch_all("modules", {"subject_id": f"eq.{subject_id}"})
        if isinstance(all_mods, list):
            for m in all_mods:
                module_id_map[m["name"]] = m["id"]

        first_module_id = module_id_map.get(payload.modules[0]) if payload.modules else None

        for sec in section_dicts:
            key = _section_key(sec["id"])
            for q_obj in result.get(key, []):
                questions_to_save.append({
                    "subject_id": subject_id,
                    "module_id": first_module_id,
                    "question_text": q_obj.get("text", ""),
                    "marks": sec["marks_per_question"],
                    "difficulty": q_obj.get("bloom", payload.difficulty),
                })

        if questions_to_save:
            insert_rows("generated_questions", questions_to_save)

        part_a = next((s for s in section_dicts if s["id"].upper() == "A"), section_dicts[0] if section_dicts else None)
        part_b = next((s for s in section_dicts if s["id"].upper() == "B"), section_dicts[1] if len(section_dicts) > 1 else None)

        insert_row("generation_logs", {
            "subject_id": subject_id,
            "modules_included": json.dumps(payload.modules),
            "five_mark_count": part_a["question_count"] if part_a else 0,
            "fifteen_mark_count": part_b["question_count"] if part_b else 0,
        })

    # Cleanup uploaded PDF and extracted content if material_id / storage_path are provided
    if payload.material_id:
        try:
            delete_row("extracted_content", "material_id", payload.material_id)
            delete_row("study_materials", "id", payload.material_id)
        except Exception as e:
            print(f"Error deleting DB records: {e}")

    if payload.storage_path:
        try:
            delete_file_from_storage("study_materials", payload.storage_path)
        except Exception as e:
            print(f"Error deleting storage file: {e}")

    return {
        "questions": result,
        "section_config": section_dicts,
        "duplicates_removed": duplicates_removed,
        "subject": payload.subject,
        "difficulty": payload.difficulty,
        "exam_header": payload.exam_header,
        "duration": payload.duration,
    }
