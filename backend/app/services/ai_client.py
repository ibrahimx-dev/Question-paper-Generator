from groq import Groq
from app.core.config import GROQ_API_KEY
import json
import time

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# Groq free tier: 6000 TPM for llama-3.1-8b-instant — keep each request well under this
MAX_MATERIAL_CHARS = 2200
MAX_OUTPUT_TOKENS = 2048

LONG_ANSWER_TYPES = {
    "Descriptive / Essay",
    "Design & Case Study",
    "Coding / Numerical",
    "Analytical",
}

ALL_QUESTION_TYPES = [
    "Short Answer",
    "Multiple Choice",
    "True / False",
    "Conceptual",
    "Fill in the Blanks",
    "Descriptive / Essay",
    "Design & Case Study",
    "Coding / Numerical",
    "Analytical",
]


def _section_key(section_id: str) -> str:
    return f"PART_{section_id.upper()}"


def _truncate_material(text: str, max_chars: int = MAX_MATERIAL_CHARS) -> str:
    """Keep prompt small: use start + end of document for context."""
    text = text.strip()
    if len(text) <= max_chars:
        return text
    half = max_chars // 2
    return (
        text[:half]
        + "\n\n[... middle content omitted to fit API limit ...]\n\n"
        + text[-half:]
    )


def _type_format_instruction(question_type: str) -> str:
    """Return formatting rules for each question type — used in the prompt."""
    instructions = {
        "Multiple Choice": (
            "Each question MUST have exactly 4 labeled options: A), B), C), D). "
            "Do NOT include an answer key or indicate the correct answer."
        ),
        "True / False": (
            "Each question must be a statement ending in a true/false claim. "
            "Do NOT include options or the answer. The student decides True or False."
        ),
        "Fill in the Blanks": (
            'Each question must contain a blank shown as "_____" in the correct place '
            "within the sentence. Do NOT reveal the answer."
        ),
        "Short Answer": "Short-answer question text only. No answer key.",
        "Conceptual": "Conceptual question asking to define or explain a concept. No answer key.",
        "Descriptive / Essay": "Detailed essay-style question text only. No answer key or model answer.",
        "Design & Case Study": "Scenario-based design/case-study question text only. No answer key.",
        "Coding / Numerical": "Coding or numerical problem question text only. No answer key.",
        "Analytical": "Analytical question requiring comparison or analysis. No answer key.",
    }
    return instructions.get(question_type, "Exam-style question. No answer key.")


def _type_example(question_type: str) -> str:
    """Return a JSON example snippet for the given question type."""
    if question_type == "Multiple Choice":
        return '[{"text":"What is X?\\nA) opt1\\nB) opt2\\nC) opt3\\nD) opt4","type":"Multiple Choice"}]'
    if question_type == "True / False":
        return '[{"text":"The sky is green.","type":"True / False"}]'
    if question_type == "Fill in the Blanks":
        return '[{"text":"The capital of France is _____.","type":"Fill in the Blanks"}]'
    return f'[{{"text":"Question text here","type":"{question_type}"}}]'


def _friendly_error(exc: Exception) -> str:
    msg = str(exc)
    if "rate_limit" in msg or "413" in msg or "Request too large" in msg:
        return (
            "The AI request was too large for your Groq free-tier limit (6000 tokens/min). "
            "Try generating fewer questions per section, or use a shorter study material file."
        )
    if "429" in msg:
        return "Groq rate limit reached. Please wait a minute and try again."
    return msg


def _generate_for_type(
    material: str,
    subject: str,
    difficulty: str,
    section_label: str,
    marks: int,
    question_type: str,
    count: int,
) -> list:
    """Generate `count` questions of a specific type for a section in one API call."""
    fmt = _type_format_instruction(question_type)
    example = _type_example(question_type)

    prompt = f"""Generate exactly {count} exam questions as JSON for subject "{subject}".
Section: {section_label} | {marks} marks each | Type: {question_type} | Difficulty: {difficulty}
Formatting rules: {fmt}
Use ONLY the study material below. Do NOT include answer keys or model answers.
Output JSON: {{"questions": {example}}}
Replace the example with {count} unique questions. Every object must have "text" and "type" fields.

Study material:
{material}"""

    max_tokens = min(MAX_OUTPUT_TOKENS, count * 150 + 200)

    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "system", "content": "Return only valid JSON with a 'questions' array. No markdown fences."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
        max_tokens=max_tokens,
    )

    parsed = json.loads(completion.choices[0].message.content)
    questions = parsed.get("questions", [])
    if not isinstance(questions, list):
        questions = []
    # Tag each question with the correct type
    for q in questions:
        if isinstance(q, dict):
            q["type"] = question_type
    return questions


def _generate_for_type_with_retry(
    material: str,
    subject: str,
    difficulty: str,
    section_label: str,
    marks: int,
    question_type: str,
    count: int,
    max_retries: int = 3,
) -> list:
    """Generate questions for a type with post-generation validation.
    If the returned count is short, re-prompt for only the missing count (up to max_retries)."""
    all_questions = []
    remaining = count

    for attempt in range(max_retries + 1):
        if remaining <= 0:
            break
        if attempt > 0:
            time.sleep(1.0)  # small delay between retries

        batch = _generate_for_type(
            material=material,
            subject=subject,
            difficulty=difficulty,
            section_label=section_label,
            marks=marks,
            question_type=question_type,
            count=remaining,
        )
        all_questions.extend(batch)
        remaining = count - len(all_questions)

        if remaining <= 0:
            break

    # Trim to exact count if we got more
    return all_questions[:count]


def generate_questions_from_ai(
    text: str,
    subject: str,
    difficulty: str,
    sections: list,
):
    """Main entry point: generate questions for all sections.
    Each section may have multiple question types with individual counts."""
    if not client:
        return {"error": "Groq client not initialized. Set GROQ_API_KEY in backend/.env"}

    material = _truncate_material(text)
    result = {}

    try:
        call_index = 0
        for section in sections:
            key = _section_key(section["id"])
            section_questions = []
            question_types = section.get("question_types", [])

            # Fallback: if old-style single question_type is sent
            if not question_types:
                qt = section.get("question_type", "Short Answer")
                question_types = [{"type": qt, "count": section["question_count"]}]

            for qt_spec in question_types:
                if call_index > 0:
                    time.sleep(1.5)  # avoid hitting TPM burst

                q_type = qt_spec["type"]
                q_count = qt_spec["count"]

                questions = _generate_for_type_with_retry(
                    material=material,
                    subject=subject,
                    difficulty=difficulty,
                    section_label=section.get("label", f"Part {section['id']}"),
                    marks=section["marks_per_question"],
                    question_type=q_type,
                    count=q_count,
                )
                section_questions.extend(questions)
                call_index += 1

            result[key] = section_questions

        # Ensure every section key exists
        for s in sections:
            key = _section_key(s["id"])
            if key not in result or not isinstance(result[key], list):
                result[key] = []

        return result
    except Exception as e:
        return {"error": _friendly_error(e)}


def pad_section_questions(questions: list, target_count: int, section: dict) -> list:
    """Pad with placeholder questions if AI returned fewer than requested.
    Respects the question_types distribution."""
    if len(questions) >= target_count:
        return questions[:target_count]

    padded = list(questions)

    # Figure out which types are short and need padding
    question_types = section.get("question_types", [])
    if not question_types:
        qt = section.get("question_type", "Short Answer")
        question_types = [{"type": qt, "count": section.get("question_count", target_count)}]

    # Count existing questions per type
    existing_counts = {}
    for q in padded:
        t = q.get("type", "Short Answer") if isinstance(q, dict) else "Short Answer"
        existing_counts[t] = existing_counts.get(t, 0) + 1

    for qt_spec in question_types:
        q_type = qt_spec["type"]
        needed = qt_spec["count"] - existing_counts.get(q_type, 0)
        for i in range(needed):
            idx = len(padded) + 1
            text = _placeholder_text(q_type, idx)
            padded.append({"text": text, "type": q_type, "bloom": section.get("difficulty", "L2")})

    # Final trim to target
    return padded[:target_count]


def _placeholder_text(question_type: str, idx: int) -> str:
    """Generate a placeholder question for the given type."""
    if question_type == "Multiple Choice":
        return (
            f"Based on the study material, which statement about topic {idx} is correct?\n"
            f"A) Option 1\nB) Option 2\nC) Option 3\nD) Option 4"
        )
    if question_type == "True / False":
        return f"State whether the following is True or False: [Statement about topic {idx} from study material]."
    if question_type == "Fill in the Blanks":
        return f"The concept related to topic {idx} is _____."
    if question_type in LONG_ANSWER_TYPES:
        return f"Discuss topic {idx} from the study material in detail."
    return f"Explain the concept of topic {idx} as covered in the study material."
