# AI-Based Automatic Question Paper Generator 📝

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
- **Database & Storage**: Supabase (PostgreSQL with storage buckets)
- **AI Inference**: Groq API (High-performance inference engine for Llama 3 models)

---

## 📁 Repository Structure

```
Automatic-Question-Paper-Generator/
├── backend/
│   ├── app/
│   │   ├── api/            # API endpoints (upload, generate, export, auth)
│   │   ├── core/           # Security, utility, and configuration modules
│   │   ├── db/             # Supabase DB integrations & connection helpers
│   │   ├── models/         # Pydantic schemas & data representations
│   │   ├── services/       # Document processing and Groq LLM interfaces
│   │   └── main.py         # Entry point for the FastAPI server
│   ├── .env                # Backend configuration variables
│   ├── requirements.txt    # Python library dependencies
│   └── venv/               # Local Python virtual environment
├── frontend/
│   ├── public/             # Static files (logo, favicon)
│   ├── src/
│   │   ├── assets/         # App logos and graphical resources
│   │   ├── components/     # Reusable layout and wrapper controls
│   │   ├── lib/            # Supabase API client initializing
│   │   ├── pages/          # App views (Dashboard, Generator, Preview)
│   │   ├── App.jsx         # Routing & primary components mounting
│   │   └── index.css       # Core styling & Tailwind theme variables
│   ├── index.html          # Shell HTML template
│   ├── package.json        # Frontend scripts and package versions
│   └── vite.config.js      # Vite compilation setup
└── database_schema.sql     # Database initialization script
```

---

## 🗄️ Database Schema

The PostgreSQL database on Supabase runs with the following schema details:

1. **`subjects`**: Represents distinct subjects (e.g. *Java Programming*).
2. **`modules`**: Stores sub-modules belonging to subjects.
3. **`study_materials`**: File records with raw remote URLs containing course resources.
4. **`extracted_content`**: Cached text contents parsed from files, indexed by module.
5. **`generated_questions`**: Questions synthesized by AI, tagged with difficulty, marks, and modules.
6. **`generation_logs`**: Logging histories describing when papers were generated, what sections were included, and total marks.

To load the schema, execute the SQL commands found in `database_schema.sql` in your Supabase SQL editor workspace.

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
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend` folder and populate it with your keys:
   ```env
   SUPABASE_URL=https://your-supabase-id.supabase.co
   SUPABASE_KEY=your-supabase-service-role-or-anon-key
   GROQ_API_KEY=gsk_your-groq-api-key
   ```
5. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend` directory and add references:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_API_BASE_URL=http://localhost:8000
   ```
4. Run the Vite development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:5173/](http://localhost:5173/) in your web browser.

---

## 📝 Usage Flow

1. **Create Subjects & Modules**: Use the dashboard control panel to add subjects and define modules.
2. **Upload Materials**: Upload a PDF or Word Document for the specific module. The backend will parse and extract relevant course texts immediately.
3. **Configure Paper generator**: Define section requirements, marks per question, total numbers to output, difficulty levels (L1 - L6 Bloom's Taxonomy), duration, and custom header titles.
4. **Generate & Synthesize**: Let the AI analyze the syllabus context and output formatted questions.
5. **Review & Export**: Review final questions in the preview tab, customize selections, and click **Export PDF** to get a print-ready document.

---

## 📄 License
This project is open-source and free for educational use.
