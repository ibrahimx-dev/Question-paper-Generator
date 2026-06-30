from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.upload import router as upload_router
from app.api.generate import router as generate_router
from app.api.export import router as export_router
from app.db.supabase import fetch_all, insert_row, delete_row, delete_old_materials

app = FastAPI(title="AI-Based Question Paper Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/api")
app.include_router(generate_router, prefix="/api")
app.include_router(export_router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "Welcome to AI-Based Question Paper Generator API"}


# ──────────────────── SUBJECTS CRUD ────────────────────

@app.get("/api/subjects")
def list_subjects():
    data = fetch_all("subjects")
    return data if isinstance(data, list) else []


@app.post("/api/subjects")
def create_subject(body: dict):
    result = insert_row("subjects", {"name": body.get("name", "")})
    return result


@app.delete("/api/subjects/{subject_id}")
def remove_subject(subject_id: str):
    delete_row("subjects", "id", subject_id)
    return {"deleted": subject_id}


# ──────────────────── MODULES CRUD ────────────────────

@app.get("/api/modules")
def list_modules(subject_id: str = None):
    params = {}
    if subject_id:
        params["subject_id"] = f"eq.{subject_id}"
    data = fetch_all("modules", params)
    return data if isinstance(data, list) else []


@app.post("/api/modules")
def create_module(body: dict):
    result = insert_row("modules", {
        "subject_id": body.get("subject_id"),
        "name": body.get("name", ""),
    })
    return result


@app.delete("/api/modules/{module_id}")
def remove_module(module_id: str):
    delete_row("modules", "id", module_id)
    return {"deleted": module_id}


@app.post("/api/cleanup-orphans")
def cleanup_orphans(hours: int = 24):
    result = delete_old_materials(hours=hours)
    return result

