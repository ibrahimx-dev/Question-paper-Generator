from fastapi import APIRouter, UploadFile, File, Form
from app.db.supabase import insert_row, fetch_all, upload_file_to_storage, get_public_url
import pdfplumber
from docx import Document
import io
import os
import re
import uuid

router = APIRouter()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract all text from a PDF file."""
    text = ""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract all text from a DOCX file."""
    doc = Document(io.BytesIO(file_bytes))
    text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
    return text.strip()


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    subject_id: str = Form(...),
    module_id: str = Form(...),
):
    file_bytes = await file.read()
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()

    # 1. Extract text
    if ext == ".pdf":
        raw_text = extract_text_from_pdf(file_bytes)
    elif ext in (".docx", ".doc"):
        raw_text = extract_text_from_docx(file_bytes)
    else:
        return {"error": "Unsupported file type. Please upload PDF or DOCX."}

    if not raw_text:
        return {"error": "Could not extract any text from the file."}

    # 2. Upload original file to Supabase Storage
    storage_path = f"{subject_id}/{module_id}/{uuid.uuid4().hex}_{filename}"
    try:
        upload_file_to_storage("study_materials", storage_path, file_bytes, file.content_type or "application/octet-stream")
    except Exception:
        pass  # Storage might not be set up yet; we still save content

    file_url = get_public_url("study_materials", storage_path)

    # 3. Save study_material record
    material = insert_row("study_materials", {
        "subject_id": subject_id,
        "file_name": filename,
        "file_url": file_url,
    })

    material_id = material[0]["id"] if isinstance(material, list) and material else None

    # 4. Save extracted content linked to the selected module
    content_data = {
        "module_id": module_id,
        "content_text": raw_text,
    }
    if material_id:
        content_data["material_id"] = material_id
        
    insert_row("extracted_content", content_data)

    return {
        "info": f"File '{filename}' processed successfully.",
        "total_characters": len(raw_text),
        "material_id": material_id,
        "storage_path": storage_path,
    }
