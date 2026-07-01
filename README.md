# 🎓 AI-Based Automatic Question Paper Generator

An intelligent, AI-powered system designed to automatically extract knowledge from uploaded study materials and synthesize custom, exam-ready question papers. Built with a modern responsive React interface, a fast FastAPI backend, and integrated with Supabase and Groq cloud services.

<p align="center">
  <img src="frontend/public/logo.jpg" alt="AI Paper Gen Logo" width="220" style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
</p>

---

## ✨ Key Features

- **Multi-Format Extraction**: Upload study materials in `.pdf` or `.docx` format; the system parses and extracts content mapped to specific subjects and modules.
- **Granular AI Configurations**: Designate sections, customize marks per question, set question counts, define options/choices, specify Bloom's taxonomy difficulty level, and restrict types (MCQ, conceptual, essays, etc.).
- **Responsive Stacked Layout**: Modern user interface that scales beautifully. Automatically shifts parameters from desktop rows to vertical stack grids on mobile screen resolutions.
- **Instant PDF Export**: Export generated question papers as high-quality PDFs formatted with custom exam headers, subject details, time duration, and section instructions.
- **Relational Storage & Logging**: Comprehensive tracking of created subjects, modules, uploaded files, extracted contents, and logs of generation history.
- **Authentication**: Secure user authentication with email/password and Google OAuth via Supabase Auth.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS 4 (Vibrant gradients, premium UI tokens)
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Backend
- **Framework**: FastAPI (Python 3)
- **Web Server**: Uvicorn
- **Document Parsers**: `pdfplumber` (PDF), `python-docx` (Word)
- **PDF Exporter**: `reportlab`
- **Environment config**: `python-dotenv`

### Cloud Services
- **Database & Auth**: Supabase (PostgreSQL + Authentication)
- **AI Inference**: Groq API (High-performance inference engine for Llama 3 models)

---

## 📁 Repository Structure

```
Question-paper/
├── backend/
│   ├── app/
│   │   ├── api/            # API endpoints (upload, generate, export, auth)
│   │   ├── core/           # Security, utility, and configuration modules
│   │   ├── db/             # Supabase DB integrations & connection helpers
│   │   ├── models/         # Pydantic schemas & data representations
│   │   ├── services/       # Document processing and Groq LLM interfaces
│   │   └── main.py         # Entry point for the FastAPI server
│   ├── Procfile            # Railway start command for backend
│   ├── railway.toml        # Railway deployment configuration
│   ├── .python-version     # Python version for Nixpacks
│   ├── .env                # Backend configuration variables (not committed)
│   └── requirements.txt    # Python library dependencies
├── frontend/
│   ├── public/             # Static files (logo, favicon)
│   ├── src/
│   │   ├── assets/         # App logos and graphical resources
│   │   ├── components/     # Reusable layout and wrapper controls
│   │   ├── contexts/       # Auth context provider
│   │   ├── lib/            # Supabase API client initialization
│   │   ├── pages/          # App views (Dashboard, Generator, Preview)
│   │   ├── App.jsx         # Routing & primary components mounting
│   │   └── index.css       # Core styling & Tailwind theme variables
│   ├── railway.toml        # Railway deployment configuration
│   ├── index.html          # Shell HTML template
│   ├── package.json        # Frontend scripts and package versions
│   └── vite.config.js      # Vite compilation setup
└── database_schema.sql     # Database initialization script
```

---

## 🗄️ Database Schema

The PostgreSQL database on Supabase runs with the following schema:

1. **`subjects`**: Represents distinct subjects (e.g. *Java Programming*).
2. **`modules`**: Stores sub-modules belonging to subjects.
3. **`study_materials`**: File records with raw remote URLs containing course resources.
4. **`extracted_content`**: Cached text contents parsed from files, indexed by module.
5. **`generated_questions`**: Questions synthesized by AI, tagged with difficulty, marks, and modules.
6. **`generation_logs`**: Logging histories describing when papers were generated, what sections were included, and total marks.

To load the schema, execute the SQL commands found in `database_schema.sql` in your Supabase SQL editor.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- A Supabase cloud project account
- A Groq developer API key

### 1. Database Setup
1. Log in to your **Supabase Dashboard** and create a new project.
2. Go to the **SQL Editor** tab.
3. Copy the contents of the `database_schema.sql` file and execute it.
4. Go to the **Storage** tab and create a public bucket named `materials` to allow study resource uploads.

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the `backend` folder:
```env
SUPABASE_URL=https://your-supabase-id.supabase.co
SUPABASE_KEY=your-supabase-service-role-or-anon-key
GROQ_API_KEY=gsk_your-groq-api-key
```

Start the server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` directory:
```env
VITE_SUPABASE_URL=https://your-supabase-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=http://localhost:8000
```

Start the dev server:
```bash
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser.

---

## ☁️ Deploy on Railway

This project is pre-configured for [Railway](https://railway.app) deployment.

### Backend Service
1. Create a new service from GitHub → set **Root Directory** to `backend`
2. Add environment variables: `SUPABASE_URL`, `SUPABASE_KEY`, `GROQ_API_KEY`
3. Generate a public domain in **Settings → Networking**

### Frontend Service
1. Create another service from the same repo → set **Root Directory** to `frontend`
2. Add environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL` (set to your deployed backend URL)
3. Generate a public domain

> **Important**: Update `VITE_API_BASE_URL` to your deployed backend Railway URL (not `localhost`).

---

## 📋 Usage Flow

1. **Create Subjects & Modules**: Use the dashboard to add subjects and define modules.
2. **Upload Materials**: Upload a PDF or Word Document for a module. The backend parses and extracts relevant content immediately.
3. **Configure Paper**: Define section requirements, marks per question, question counts, difficulty levels (L1–L6 Bloom's Taxonomy), duration, and custom header titles.
4. **Generate**: Let the AI analyze the syllabus context and output formatted questions.
5. **Review & Export**: Review questions in the preview tab and click **Export PDF** to get a print-ready document.

---

## 📄 License
This project is open-source and free for educational use.
