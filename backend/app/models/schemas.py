from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import List, Optional, Dict


class QuestionTypeSpec(BaseModel):
    """One question-type entry inside a section, e.g. { type: 'Multiple Choice', count: 10 }."""
    type: str
    count: int


class SectionSpec(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    label: str
    marks_per_question: int = Field(alias="marksPerQuestion")
    question_count: int = Field(alias="questionCount")
    answer_count: int
    # New multi-type field
    question_types: Optional[List[QuestionTypeSpec]] = None
    # Legacy single-type field (kept for backward compatibility)
    question_type: Optional[str] = None

    @model_validator(mode="after")
    def normalise_question_types(self):
        """If only the legacy `question_type` string was sent, convert it to a
        single-element `question_types` list so downstream code only needs to
        handle one shape."""
        if not self.question_types:
            qt = self.question_type or "Short Answer"
            self.question_types = [QuestionTypeSpec(type=qt, count=self.question_count)]
        return self


class GenerateRequest(BaseModel):
    subject: str
    modules: List[str]
    difficulty: str
    sections: List[SectionSpec]
    exam_header: Optional[str] = "University Examination"
    duration: Optional[str] = "3 Hours"
    material_id: Optional[str] = None
    storage_path: Optional[str] = None
    # Legacy fields kept for backward compatibility
    five_mark_questions: Optional[int] = None
    fifteen_mark_questions: Optional[int] = None
    part_a_question_type: Optional[str] = None
    part_b_question_type: Optional[str] = None
    module_requirements: Optional[Dict[str, Dict[str, int]]] = None


class GenerateResponse(BaseModel):
    questions: dict
    section_config: Optional[List[dict]] = None
