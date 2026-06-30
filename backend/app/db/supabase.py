import httpx
from datetime import datetime, timedelta, timezone
from app.core.config import SUPABASE_URL, SUPABASE_KEY

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

REST_URL = f"{SUPABASE_URL}/rest/v1"
AUTH_URL = f"{SUPABASE_URL}/auth/v1"
STORAGE_URL = f"{SUPABASE_URL}/storage/v1"


# ──────────────────── AUTH HELPERS ────────────────────

def sign_up_user(email: str, password: str):
    """Register a new user via Supabase Auth."""
    resp = httpx.post(
        f"{AUTH_URL}/signup",
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": password},
    )
    return resp.json()


def sign_in_user(email: str, password: str):
    """Sign in a user via Supabase Auth and return access token."""
    resp = httpx.post(
        f"{AUTH_URL}/token?grant_type=password",
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        json={"email": email, "password": password},
    )
    return resp.json()


# ──────────────────── TABLE HELPERS ────────────────────

def fetch_all(table: str, params: dict = None):
    """SELECT * from a table, optionally filtered via query params."""
    resp = httpx.get(f"{REST_URL}/{table}", headers=HEADERS, params=params or {})
    return resp.json()


def insert_row(table: str, data: dict):
    """INSERT a single row and return the inserted record."""
    resp = httpx.post(f"{REST_URL}/{table}", headers=HEADERS, json=data)
    return resp.json()


def insert_rows(table: str, data: list):
    """INSERT multiple rows."""
    resp = httpx.post(f"{REST_URL}/{table}", headers=HEADERS, json=data)
    return resp.json()


def delete_row(table: str, column: str, value: str):
    """DELETE rows where column=value."""
    resp = httpx.delete(
        f"{REST_URL}/{table}",
        headers=HEADERS,
        params={column: f"eq.{value}"},
    )
    return resp.status_code


def update_row(table: str, column: str, value: str, data: dict):
    """UPDATE rows where column=value."""
    resp = httpx.patch(
        f"{REST_URL}/{table}",
        headers=HEADERS,
        params={column: f"eq.{value}"},
        json=data,
    )
    return resp.json()


# ──────────────────── STORAGE HELPERS ────────────────────

def upload_file_to_storage(bucket: str, file_path: str, file_bytes: bytes, content_type: str):
    """Upload a file to Supabase Storage."""
    upload_headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": content_type,
    }
    resp = httpx.post(
        f"{STORAGE_URL}/object/{bucket}/{file_path}",
        headers=upload_headers,
        content=file_bytes,
    )
    return resp.json()


def get_public_url(bucket: str, file_path: str):
    """Return the public URL for a file in Supabase Storage."""
    return f"{STORAGE_URL}/object/public/{bucket}/{file_path}"


def delete_file_from_storage(bucket: str, file_path: str):
    """Delete a file from Supabase Storage."""
    delete_headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    resp = httpx.delete(
        f"{STORAGE_URL}/object/{bucket}/{file_path}",
        headers=delete_headers,
    )
    return resp.json()


def delete_old_materials(hours: int = 24):
    """Delete study materials and their files from storage, and extracted contents, if uploaded_at is older than `hours`."""
    cutoff_time = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    resp = httpx.get(
        f"{REST_URL}/study_materials",
        headers=HEADERS,
        params={"uploaded_at": f"lt.{cutoff_time}"}
    )
    
    try:
        materials = resp.json()
    except Exception:
        return {"status": "error", "message": "Failed to parse materials json"}

    if not isinstance(materials, list):
        return {"status": "error", "message": f"Unexpected response format: {materials}"}
    
    deleted_count = 0
    for mat in materials:
        mat_id = mat.get("id")
        file_url = mat.get("file_url")
        storage_path = None
        if file_url and "/study_materials/" in file_url:
            storage_path = file_url.split("/study_materials/")[-1]
            
        if mat_id:
            # Delete extracted content first
            httpx.delete(
                f"{REST_URL}/extracted_content",
                headers=HEADERS,
                params={"material_id": f"eq.{mat_id}"}
            )
            # Delete study material row
            httpx.delete(
                f"{REST_URL}/study_materials",
                headers=HEADERS,
                params={"id": f"eq.{mat_id}"}
            )
            # Delete file from storage
            if storage_path:
                httpx.delete(
                    f"{STORAGE_URL}/object/study_materials/{storage_path}",
                    headers={
                        "apikey": SUPABASE_KEY,
                        "Authorization": f"Bearer {SUPABASE_KEY}",
                    }
                )
            deleted_count += 1
            
    return {"status": "success", "deleted_count": deleted_count}

