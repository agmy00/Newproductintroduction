# NPI Project Management System

A full-stack prototype for **New Product Introduction (NPI)** project management with integrated RAG-powered AI assistant.

## Features

| Persona | Capability |
|---------|-----------|
| Project Manager | Create NPI projects with typed classification |
| Project Manager | Create activities + interactive Gantt chart |
| Project Manager | Define Phase Gate checkpoints with mandatory approvals |
| Contributors | Add department-tagged comments (Draft → Approved workflow) |
| Contributors | Upload Minutes of Meeting (PDF/DOCX) with in-browser viewer |
| Contributors | Upload Purchase Orders (PDF) with in-browser viewer |
| Design Engineer | Link SolidWorks drawings (path/number/revision) to activities |
| All Users | Link Outlook emails (subject, sender, body) to projects |
| All Users (AI) | RAG query: natural language search across all project data |
| All Users (AI) | Context Reconstruction: full decision story aggregation |

## Tech Stack

- **Backend:** Python · FastAPI · SQLite (SQLAlchemy) · TF-IDF RAG engine
- **Frontend:** React 18 · TypeScript · Vite · Tailwind CSS
- **RAG:** Custom TF-IDF retrieval (no external API key required)
- **Document parsing:** PyPDF2 · python-docx

## Quick Start

### Option 1: Startup Script
```bash
chmod +x start.sh
./start.sh
```

### Option 2: Manual

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:3000

## API Documentation

Swagger UI available at: http://localhost:8000/docs

## RAG Knowledge Base

Documents are automatically ingested when:
- A comment is **approved** (draft → approved workflow)
- A document (MoM or PO) is **uploaded** — text extracted via PyPDF2/python-docx
- An email is **linked** to the project

Query modes:
- **RAG Query** — finds specific answers with source citations
- **Context Reconstruction** — aggregates all related sources to tell the full decision story

## Architecture

```
frontend/                     # React SPA
  src/
    pages/
      Dashboard.tsx           # Project list
      CreateProject.tsx       # New NPI project wizard
      ProjectDetail.tsx       # Tabbed project view
      RAGChat.tsx             # AI assistant interface
    components/
      GanttChart.tsx          # Custom Gantt implementation
      PhaseGates.tsx          # Phase gate management + approvals
      CommentSection.tsx      # Draft/approve comment workflow
      DocumentUpload.tsx      # MoM + PO upload with viewer
      DrawingLinks.tsx        # SolidWorks drawing references
      EmailLinks.tsx          # Outlook email linking
    api/client.ts             # Axios API client

backend/
  main.py                     # FastAPI app + all endpoints + RAG engine
  uploads/                    # Uploaded document storage
  npi.db                      # SQLite database (auto-created)
```

## Default NPI Phases (auto-created)

1. Concept & Feasibility
2. Design & Development
3. Prototype & Validation
4. Pilot Production
5. Mass Production
