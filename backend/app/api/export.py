from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.db.supabase import fetch_all
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
import io
import re

router = APIRouter()


def _wrap_text(text: str, max_chars: int) -> list:
    lines_out = []
    for explicit_line in text.splitlines():
        if not explicit_line.strip():
            lines_out.append("")
            continue
        words = explicit_line.split()
        current = ""
        for word in words:
            if len(current) + len(word) + 1 > max_chars:
                lines_out.append(current)
                current = word
            else:
                current = f"{current} {word}".strip()
        if current:
            lines_out.append(current)
    return lines_out or [""]


def _clean_short_text(q_text: str) -> str:
    q_text = re.sub(r'\s*[\(\[]\s*L[1-6]\s*[\)\]]', '', q_text, flags=re.IGNORECASE)
    q_text = re.sub(r'^\s*L[1-6]\s*[-:.]\s*', '', q_text, flags=re.IGNORECASE)
    q_text = re.sub(r'\s*[\(\[]\s*\d+\s*marks?\s*[\)\]]', '', q_text, flags=re.IGNORECASE)
    return q_text.strip()


def _format_long_text(q_text: str) -> str:
    q_text = q_text.replace("\\n", "\n")
    q_text = re.sub(r'\s*\bOR\b\s*(B\))', r'\n\nOR\n\n\1', q_text, flags=re.IGNORECASE)
    return q_text


def _draw_question_block(c, y, height, q_num, q_text, question_type="Short Answer"):
    """Draw a single question block, formatted appropriately for its type."""
    # Clean text based on type
    if question_type in ("Multiple Choice", "Fill in the Blanks", "True / False"):
        q_text = _clean_short_text(q_text)
    elif question_type in ("Descriptive / Essay", "Design & Case Study",
                           "Coding / Numerical", "Analytical"):
        q_text = _format_long_text(q_text)
    else:
        q_text = _clean_short_text(q_text)

    lines = _wrap_text(q_text, 85)
    for j, line in enumerate(lines):
        if y < 25 * mm:
            c.showPage()
            y = height - 25 * mm
            c.setFont("Helvetica", 11)
        if j == 0:
            c.drawString(30 * mm, y, f"{q_num}. {line}")
        else:
            c.drawString(37 * mm, y, f"   {line}")
        y -= 6 * mm
    return y - 3 * mm


def _group_questions_by_type(questions: list, question_types: list) -> list:
    """Group questions by their type field, preserving the order specified in question_types.
    Returns a list of (type_name, questions_list) tuples."""
    # Build ordered type list from the section config
    type_order = [qt["type"] for qt in question_types] if question_types else []

    groups = {}
    for q in questions:
        q_type = q.get("type", "Short Answer") if isinstance(q, dict) else "Short Answer"
        if q_type not in groups:
            groups[q_type] = []
        groups[q_type].append(q)

    # Return in the config order, then any remaining types
    result = []
    seen = set()
    for t in type_order:
        if t in groups:
            result.append((t, groups[t]))
            seen.add(t)
    for t, qs in groups.items():
        if t not in seen:
            result.append((t, qs))

    return result


def build_question_paper_pdf(
    subject: str,
    sections: list,
    difficulty: str = "Unknown",
    time: str = "3 Hours",
    max_marks: int = 75,
    exam_header: str = "University Examination",
    part_a: list = None,
    part_b: list = None,
    part_a_title: str = None,
    part_a_subtitle: str = None,
    part_b_title: str = None,
    part_b_subtitle: str = None,
) -> bytes:
    """Generate a formatted question paper PDF using reportlab.
    Questions within each section are grouped by type with sub-headings."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 40 * mm

    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, y, exam_header)
    y -= 10 * mm

    c.setLineWidth(1.5)
    c.line(30 * mm, y, width - 30 * mm, y)
    y -= 8 * mm

    c.setFont("Helvetica-Bold", 11)
    c.drawString(30 * mm, y, f"Subject: {subject}")
    c.drawCentredString(width / 2, y, f"Time: {time}")
    c.drawRightString(width - 30 * mm, y, f"Maximum Marks: {max_marks}")
    y -= 6 * mm
    c.drawString(30 * mm, y, f"Difficulty Level: {difficulty}")
    y -= 6 * mm
    c.line(30 * mm, y, width - 30 * mm, y)
    y -= 12 * mm

    # Build section list from new format or legacy PART_A/PART_B
    if not sections:
        sections = []
        if part_a:
            sections.append({
                "title": part_a_title or "PART A",
                "subtitle": part_a_subtitle or "Answer any 5 questions",
                "marks_per_question": 5,
                "questions": part_a,
            })
        if part_b:
            sections.append({
                "title": part_b_title or "PART B",
                "subtitle": part_b_subtitle or "Answer ALL questions",
                "marks_per_question": 15,
                "questions": part_b,
            })

    q_num = 1
    for sec in sections:
        if y < 40 * mm:
            c.showPage()
            y = height - 25 * mm

        title = sec.get("title", sec.get("label", "SECTION"))
        subtitle = sec.get("subtitle", "")
        marks = sec.get("marks_per_question", 5)
        sec_questions = sec.get("questions", [])
        question_types = sec.get("question_types", [])

        # Draw section title
        c.setFont("Helvetica-Bold", 13)
        c.drawCentredString(width / 2, y, title)
        y -= 4 * mm
        c.setFont("Helvetica-Oblique", 9)
        c.drawCentredString(width / 2, y, subtitle)
        y -= 10 * mm

        # Group questions by type for sub-headings
        type_groups = _group_questions_by_type(sec_questions, question_types)
        has_multiple_types = len(type_groups) > 1

        sec_label = sec.get("label", title).strip().upper()

        for type_name, type_questions in type_groups:
            # Draw sub-heading if there are multiple types in this section
            if has_multiple_types:
                if y < 35 * mm:
                    c.showPage()
                    y = height - 25 * mm

                start_num = q_num
                end_num = q_num + len(type_questions) - 1
                sub_heading = f"{sec_label} – {type_name} ({start_num}–{end_num})"

                c.setFont("Helvetica-Bold", 10)
                c.drawString(30 * mm, y, sub_heading)
                y -= 8 * mm

            c.setFont("Helvetica", 11)
            for q_obj in type_questions:
                q_text = q_obj.get("text", "") if isinstance(q_obj, dict) else str(q_obj)
                y = _draw_question_block(c, y, height, q_num, q_text, question_type=type_name)
                q_num += 1

            if has_multiple_types:
                y -= 4 * mm  # extra space between type groups

        y -= 8 * mm

    y -= 10 * mm
    if y < 25 * mm:
        c.showPage()
        y = height - 25 * mm
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(width / 2, y, "*** End of Question Paper ***")

    c.save()
    buffer.seek(0)
    return buffer.read()


@router.post("/export")
def export_pdf(data: dict):
    subject = data.get("subject", "Unknown Subject")
    difficulty = data.get("difficulty", "Unknown")
    exam_header = data.get("exam_header", "University Examination")
    time_dur = data.get("duration", "3 Hours")
    max_marks = data.get("max_marks", 75)
    sections = data.get("sections", [])

    pdf_bytes = build_question_paper_pdf(
        subject=subject,
        sections=sections,
        difficulty=difficulty,
        time=time_dur,
        max_marks=max_marks,
        exam_header=exam_header,
        part_a=data.get("PART_A", []),
        part_b=data.get("PART_B", []),
        part_a_title=data.get("part_a_title"),
        part_a_subtitle=data.get("part_a_subtitle"),
        part_b_title=data.get("part_b_title"),
        part_b_subtitle=data.get("part_b_subtitle"),
    )

    safe_subject = re.sub(r'[^a-zA-Z0-9_\-]', '_', subject)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="question_paper_{safe_subject}.pdf"'},
    )


@router.get("/analytics")
def get_analytics():
    logs = fetch_all("generation_logs", {"order": "created_at.desc", "limit": "50"})
    questions = fetch_all("generated_questions")
    questions_count = len(questions) if isinstance(questions, list) else 0
    return {
        "logs": logs if isinstance(logs, list) else [],
        "questions_count": questions_count
    }
