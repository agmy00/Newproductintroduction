"""
NPI Project Management System - Backend API
FastAPI + SQLite + TF-IDF RAG Engine
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy import (
    create_engine, Column, Integer, String, Float,
    DateTime, ForeignKey, Text, Boolean, JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any
import os
import shutil
import json
import re
import math
from collections import defaultdict, Counter

# ---------------------------------------------------------------------------
# Database setup
# ---------------------------------------------------------------------------
DATABASE_URL = "sqlite:///./npi.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# ORM Models
# ---------------------------------------------------------------------------
class ProjectDB(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    project_type = Column(String, default="NPI")
    status = Column(String, default="active")
    created_by = Column(String, default="Project Manager")
    created_at = Column(DateTime, default=datetime.utcnow)


class PhaseDB(Base):
    __tablename__ = "phases"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    name = Column(String)
    order_index = Column(Integer)
    status = Column(String, default="pending")  # pending | active | completed


class PhaseGateDB(Base):
    __tablename__ = "phase_gates"
    id = Column(Integer, primary_key=True, index=True)
    phase_id = Column(Integer, ForeignKey("phases.id"))
    name = Column(String)
    description = Column(Text, default="")
    required_approvers = Column(JSON, default=list)   # ["Engineering","Quality","PM"]
    approvals = Column(JSON, default=list)             # [{user, dept, approved_at}]
    status = Column(String, default="pending")         # pending | approved | rejected
    is_blocking = Column(Boolean, default=True)


class ActivityDB(Base):
    __tablename__ = "activities"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    phase_id = Column(Integer, ForeignKey("phases.id"), nullable=True)
    name = Column(String)
    description = Column(Text, default="")
    start_date = Column(String)
    end_date = Column(String)
    progress = Column(Float, default=0)
    assignee = Column(String, default="")
    status = Column(String, default="pending")         # pending | in_progress | completed
    parent_id = Column(Integer, ForeignKey("activities.id"), nullable=True)


class CommentDB(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"))
    author = Column(String)
    department = Column(String)
    content = Column(Text)
    status = Column(String, default="draft")           # draft | approved | rejected
    approved_by = Column(String, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DocumentDB(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=True)
    doc_type = Column(String)                          # mom | po
    filename = Column(String)
    filepath = Column(String)
    uploaded_by = Column(String, default="")
    content_text = Column(Text, default="")            # extracted text for RAG
    created_at = Column(DateTime, default=datetime.utcnow)


class DrawingDB(Base):
    __tablename__ = "drawings"
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"))
    sw_path = Column(String)
    drawing_number = Column(String, default="")
    revision = Column(String, default="A")
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class EmailDB(Base):
    __tablename__ = "emails"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=True)
    subject = Column(String)
    sender = Column(String)
    recipients = Column(JSON, default=list)
    body = Column(Text)
    email_date = Column(String)
    linked_by = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class RAGDocumentDB(Base):
    __tablename__ = "rag_documents"
    id = Column(Integer, primary_key=True, index=True)
    source_type = Column(String)   # comment | mom | po | email
    source_id = Column(Integer)
    project_id = Column(Integer, ForeignKey("projects.id"))
    content = Column(Text)
    meta = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    project_type: str = "NPI"
    created_by: str = "Project Manager"


class PhaseCreate(BaseModel):
    name: str
    order_index: int


class PhaseGateCreate(BaseModel):
    name: str
    description: str = ""
    required_approvers: List[str] = []
    is_blocking: bool = True


class GateApproval(BaseModel):
    user: str
    department: str


class ActivityCreate(BaseModel):
    project_id: int
    phase_id: Optional[int] = None
    name: str
    description: str = ""
    start_date: str
    end_date: str
    assignee: str = ""
    parent_id: Optional[int] = None


class ActivityUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    progress: Optional[float] = None
    assignee: Optional[str] = None
    status: Optional[str] = None


class CommentCreate(BaseModel):
    author: str
    department: str
    content: str


class CommentApprove(BaseModel):
    approved_by: str


class DrawingCreate(BaseModel):
    sw_path: str
    drawing_number: str = ""
    revision: str = "A"
    description: str = ""


class EmailCreate(BaseModel):
    subject: str
    sender: str
    recipients: List[str] = []
    body: str
    email_date: str
    linked_by: str = ""
    activity_id: Optional[int] = None


class RAGQuery(BaseModel):
    question: str
    project_id: Optional[int] = None
    top_k: int = 5


# ---------------------------------------------------------------------------
# TF-IDF RAG Engine
# ---------------------------------------------------------------------------
class RAGEngine:
    """Simple TF-IDF based retrieval engine – no external API keys required."""

    def __init__(self):
        self.documents: List[Dict] = []
        self.tfidf_matrix = None
        self.vectorizer = None
        self._dirty = True

    # --- Tokeniser ---------------------------------------------------------
    @staticmethod
    def _tokenize(text: str) -> List[str]:
        text = text.lower()
        tokens = re.findall(r"[a-z0-9']+", text)
        stopwords = {
            "the", "a", "an", "is", "in", "on", "at", "to", "for",
            "of", "and", "or", "but", "with", "was", "are", "were",
            "it", "its", "this", "that", "we", "our", "be", "been",
            "have", "has", "had", "do", "did", "will", "would", "can",
            "could", "should", "from", "by", "as", "up", "so", "if",
        }
        return [t for t in tokens if t not in stopwords and len(t) > 1]

    # --- TF-IDF helpers ----------------------------------------------------
    @staticmethod
    def _compute_tf(tokens: List[str]) -> Dict[str, float]:
        count = Counter(tokens)
        total = len(tokens) or 1
        return {t: c / total for t, c in count.items()}

    def _build_index(self):
        if not self.documents:
            return
        # Vocabulary
        vocab: Dict[str, int] = {}
        tokenized = []
        for doc in self.documents:
            toks = self._tokenize(doc["content"])
            tokenized.append(toks)
            for t in toks:
                if t not in vocab:
                    vocab[t] = len(vocab)

        N = len(self.documents)
        V = len(vocab)
        if V == 0:
            return

        # IDF
        df = defaultdict(int)
        for toks in tokenized:
            for t in set(toks):
                df[t] += 1
        idf = {t: math.log((N + 1) / (df[t] + 1)) + 1 for t in vocab}

        # TF-IDF matrix (dense, list of lists)
        matrix = []
        for toks in tokenized:
            tf = self._compute_tf(toks)
            vec = [tf.get(t, 0.0) * idf.get(t, 0.0) for t in vocab]
            # L2 normalise
            norm = math.sqrt(sum(v ** 2 for v in vec)) or 1.0
            matrix.append([v / norm for v in vec])

        self.vocab = vocab
        self.idf = idf
        self.matrix = matrix
        self._dirty = False

    def _query_vec(self, query: str) -> List[float]:
        if not hasattr(self, "vocab"):
            return []
        toks = self._tokenize(query)
        tf = self._compute_tf(toks)
        vec = [tf.get(t, 0.0) * self.idf.get(t, 0.0) for t in self.vocab]
        norm = math.sqrt(sum(v ** 2 for v in vec)) or 1.0
        return [v / norm for v in vec]

    @staticmethod
    def _cosine(a: List[float], b: List[float]) -> float:
        return sum(x * y for x, y in zip(a, b))

    # --- Public API --------------------------------------------------------
    def add_document(self, doc_id: int, source_type: str, content: str, meta: dict):
        self.documents.append({
            "id": doc_id,
            "source_type": source_type,
            "content": content,
            "meta": meta,
        })
        self._dirty = True

    def load_from_db(self, db: Session):
        rows = db.query(RAGDocumentDB).all()
        self.documents = [
            {"id": r.id, "source_type": r.source_type, "content": r.content, "meta": r.meta or {}}
            for r in rows
        ]
        self._dirty = True

    def retrieve(self, query: str, project_id: Optional[int], top_k: int = 5) -> List[Dict]:
        if self._dirty:
            self._build_index()
        if not self.documents or not hasattr(self, "vocab"):
            return []

        qvec = self._query_vec(query)
        if not qvec:
            return []

        scores = [self._cosine(qvec, dvec) for dvec in self.matrix]
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)

        results = []
        for idx, score in ranked:
            doc = self.documents[idx]
            if project_id and doc["meta"].get("project_id") and doc["meta"]["project_id"] != project_id:
                continue
            if score < 0.01:
                continue
            results.append({**doc, "score": round(score, 4)})
            if len(results) >= top_k:
                break
        return results

    def generate_answer(self, question: str, context_docs: List[Dict]) -> str:
        if not context_docs:
            return (
                "No relevant information found in the project knowledge base for your question. "
                "Make sure comments are approved, documents are uploaded, and emails are linked."
            )

        lines = [f"**Answer based on {len(context_docs)} retrieved source(s):**\n"]
        for i, doc in enumerate(context_docs, 1):
            meta = doc.get("meta", {})
            source_label = {
                "comment": f"Comment by {meta.get('author','?')} [{meta.get('department','?')}]",
                "mom": f"Minutes of Meeting: {meta.get('filename','?')}",
                "po": f"Purchase Order: {meta.get('filename','?')}",
                "email": f"Email: {meta.get('subject','?')} from {meta.get('sender','?')} on {meta.get('date','?')}",
            }.get(doc["source_type"], doc["source_type"])

            snippet = doc["content"][:400].replace("\n", " ")
            if len(doc["content"]) > 400:
                snippet += "..."

            lines.append(f"**[{i}] {source_label}** (relevance: {doc['score']})")
            lines.append(f"> {snippet}\n")

        lines.append(
            "\n*Sources retrieved via TF-IDF keyword search across approved comments, "
            "uploaded MoM/PO documents, and linked emails.*"
        )
        return "\n".join(lines)

    def reconstruct_context(self, topic: str, project_id: Optional[int], db: Session) -> str:
        """Aggregate all sources related to a topic to tell the full story."""
        results = self.retrieve(topic, project_id, top_k=15)
        if not results:
            return f"No historical context found for: **{topic}**"

        by_type: Dict[str, List] = defaultdict(list)
        for r in results:
            by_type[r["source_type"]].append(r)

        lines = [f"## Context Reconstruction: *{topic}*\n"]
        lines.append(
            "The AI has aggregated the following scattered data sources to reconstruct "
            f"the full decision history for **{topic}**:\n"
        )

        order = ["email", "comment", "mom", "po"]
        type_labels = {"email": "Linked Emails", "comment": "Team Comments", "mom": "Meeting Minutes", "po": "Purchase Orders"}

        for stype in order:
            docs = by_type.get(stype, [])
            if not docs:
                continue
            lines.append(f"### {type_labels[stype]} ({len(docs)} source(s))")
            for doc in docs:
                meta = doc.get("meta", {})
                if stype == "email":
                    lines.append(f"- **{meta.get('date','?')}** | From: {meta.get('sender','?')} | Subject: *{meta.get('subject','?')}*")
                elif stype == "comment":
                    lines.append(f"- **{meta.get('department','?')}** ({meta.get('author','?')}): {doc['content'][:200]}...")
                elif stype in ("mom", "po"):
                    lines.append(f"- {meta.get('filename','?')} (uploaded {meta.get('uploaded_at','?')[:10]})")
                lines.append(f"  > {doc['content'][:300].replace(chr(10),' ')}")
            lines.append("")

        lines.append("---")
        lines.append("*Context reconstructed by aggregating comments, emails, POs, and meeting minutes.*")
        return "\n".join(lines)


# Singleton RAG engine
rag_engine = RAGEngine()


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------
app = FastAPI(title="NPI Project Management System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _chunk_text(text: str, chunk_size: int = 600, overlap: int = 100) -> List[str]:
    """Split text into overlapping chunks, preferring sentence boundaries."""
    text = text.strip()
    if len(text) <= chunk_size:
        return [text] if text else []
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end < len(text):
            # Prefer breaking at a sentence boundary
            boundary = text.rfind('. ', start + chunk_size // 2, end)
            if boundary != -1:
                end = boundary + 1
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap
    return chunks


def _ingest_to_rag(db: Session, source_type: str, source_id: int,
                   project_id: int, content: str, meta: dict):
    """Split content into chunks and store each as a separate RAG row."""
    # Remove all existing chunks for this source before re-ingesting
    db.query(RAGDocumentDB).filter(
        RAGDocumentDB.source_type == source_type,
        RAGDocumentDB.source_id == source_id,
    ).delete()

    chunks = _chunk_text(content)
    for i, chunk in enumerate(chunks):
        chunk_meta = {**meta, "chunk_index": i, "total_chunks": len(chunks)}
        row = RAGDocumentDB(
            source_type=source_type,
            source_id=source_id,
            project_id=project_id,
            content=chunk,
            meta=chunk_meta,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        rag_engine.add_document(row.id, source_type, chunk, chunk_meta)
    rag_engine._dirty = True


def _extract_text_from_file(filepath: str, filename: str) -> str:
    """Extract plain text from PDF or DOCX files."""
    ext = filename.rsplit(".", 1)[-1].lower()
    text = ""
    try:
        if ext == "pdf":
            import PyPDF2
            with open(filepath, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text += (page.extract_text() or "") + "\n"
        elif ext in ("docx", "doc"):
            import docx as docxlib
            doc = docxlib.Document(filepath)
            text = "\n".join(p.text for p in doc.paragraphs)
        else:
            text = f"[Binary file: {filename}]"
    except Exception as e:
        text = f"[Could not extract text: {e}]"
    return text.strip()


# ---------------------------------------------------------------------------
# Startup: load RAG index
# ---------------------------------------------------------------------------
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        rag_engine.load_from_db(db)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------
@app.get("/api/projects")
def list_projects(db: Session = Depends(get_db)):
    rows = db.query(ProjectDB).order_by(ProjectDB.created_at.desc()).all()
    return [
        {
            "id": r.id, "name": r.name, "description": r.description,
            "project_type": r.project_type, "status": r.status,
            "created_by": r.created_by,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@app.post("/api/projects")
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    p = ProjectDB(**body.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)

    # Seed default NPI phases
    default_phases = [
        "Concept & Feasibility",
        "Design & Development",
        "Prototype & Validation",
        "Pilot Production",
        "Mass Production",
    ]
    for idx, name in enumerate(default_phases):
        phase = PhaseDB(project_id=p.id, name=name, order_index=idx, status="pending")
        db.add(phase)
    db.commit()

    return {"id": p.id, "name": p.name, "message": "Project created with default NPI phases"}


@app.get("/api/projects/{project_id}")
def get_project(project_id: int, db: Session = Depends(get_db)):
    p = db.query(ProjectDB).filter(ProjectDB.id == project_id).first()
    if not p:
        raise HTTPException(404, "Project not found")
    phases = db.query(PhaseDB).filter(PhaseDB.project_id == project_id).order_by(PhaseDB.order_index).all()
    activities = db.query(ActivityDB).filter(ActivityDB.project_id == project_id).all()
    return {
        "id": p.id, "name": p.name, "description": p.description,
        "project_type": p.project_type, "status": p.status,
        "created_by": p.created_by,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "phases": [
            {"id": ph.id, "name": ph.name, "order_index": ph.order_index, "status": ph.status}
            for ph in phases
        ],
        "activity_count": len(activities),
    }


# ---------------------------------------------------------------------------
# Phases
# ---------------------------------------------------------------------------
@app.get("/api/projects/{project_id}/phases")
def list_phases(project_id: int, db: Session = Depends(get_db)):
    phases = db.query(PhaseDB).filter(PhaseDB.project_id == project_id).order_by(PhaseDB.order_index).all()
    result = []
    for ph in phases:
        gates = db.query(PhaseGateDB).filter(PhaseGateDB.phase_id == ph.id).all()
        result.append({
            "id": ph.id, "name": ph.name, "order_index": ph.order_index, "status": ph.status,
            "gates": [
                {
                    "id": g.id, "name": g.name, "description": g.description,
                    "required_approvers": g.required_approvers or [],
                    "approvals": g.approvals or [],
                    "status": g.status, "is_blocking": g.is_blocking,
                }
                for g in gates
            ],
        })
    return result


@app.post("/api/projects/{project_id}/phases")
def add_phase(project_id: int, body: PhaseCreate, db: Session = Depends(get_db)):
    ph = PhaseDB(project_id=project_id, **body.model_dump())
    db.add(ph)
    db.commit()
    db.refresh(ph)
    return {"id": ph.id, "name": ph.name}


@app.patch("/api/phases/{phase_id}/status")
def update_phase_status(phase_id: int, status: str = Query(...), db: Session = Depends(get_db)):
    ph = db.query(PhaseDB).filter(PhaseDB.id == phase_id).first()
    if not ph:
        raise HTTPException(404, "Phase not found")
    # Check if there is a blocking gate that hasn't been approved
    if status == "completed":
        gates = db.query(PhaseGateDB).filter(
            PhaseGateDB.phase_id == phase_id,
            PhaseGateDB.is_blocking == True,
        ).all()
        for g in gates:
            if g.status != "approved":
                raise HTTPException(
                    400,
                    f"Phase gate '{g.name}' must be approved before completing this phase.",
                )
    ph.status = status
    db.commit()
    return {"id": ph.id, "status": ph.status}


# ---------------------------------------------------------------------------
# Phase Gates
# ---------------------------------------------------------------------------
@app.get("/api/phases/{phase_id}/gates")
def list_gates(phase_id: int, db: Session = Depends(get_db)):
    gates = db.query(PhaseGateDB).filter(PhaseGateDB.phase_id == phase_id).all()
    return [
        {
            "id": g.id, "name": g.name, "description": g.description,
            "required_approvers": g.required_approvers or [],
            "approvals": g.approvals or [],
            "status": g.status, "is_blocking": g.is_blocking,
        }
        for g in gates
    ]


@app.post("/api/phases/{phase_id}/gates")
def create_gate(phase_id: int, body: PhaseGateCreate, db: Session = Depends(get_db)):
    g = PhaseGateDB(phase_id=phase_id, **body.model_dump())
    db.add(g)
    db.commit()
    db.refresh(g)
    return {"id": g.id, "name": g.name}


@app.post("/api/gates/{gate_id}/approve")
def approve_gate(gate_id: int, body: GateApproval, db: Session = Depends(get_db)):
    g = db.query(PhaseGateDB).filter(PhaseGateDB.id == gate_id).first()
    if not g:
        raise HTTPException(404, "Gate not found")
    approvals = list(g.approvals or [])
    # Prevent duplicate approval from same department
    existing_depts = {a["department"] for a in approvals}
    if body.department in existing_depts:
        raise HTTPException(400, f"Department '{body.department}' has already approved this gate.")
    approvals.append({
        "user": body.user,
        "department": body.department,
        "approved_at": datetime.utcnow().isoformat(),
    })
    g.approvals = approvals
    # Check if all required approvers have signed
    required = set(g.required_approvers or [])
    approved_depts = {a["department"] for a in approvals}
    if required and required.issubset(approved_depts):
        g.status = "approved"
    db.commit()
    return {"id": g.id, "status": g.status, "approvals": approvals}


# ---------------------------------------------------------------------------
# Activities
# ---------------------------------------------------------------------------
@app.get("/api/projects/{project_id}/activities")
def list_activities(project_id: int, db: Session = Depends(get_db)):
    acts = db.query(ActivityDB).filter(ActivityDB.project_id == project_id).all()
    return [
        {
            "id": a.id, "project_id": a.project_id, "phase_id": a.phase_id,
            "name": a.name, "description": a.description,
            "start_date": a.start_date, "end_date": a.end_date,
            "progress": a.progress, "assignee": a.assignee,
            "status": a.status, "parent_id": a.parent_id,
        }
        for a in acts
    ]


@app.post("/api/activities")
def create_activity(body: ActivityCreate, db: Session = Depends(get_db)):
    a = ActivityDB(**body.model_dump())
    db.add(a)
    db.commit()
    db.refresh(a)
    return {"id": a.id, "name": a.name}


@app.patch("/api/activities/{activity_id}")
def update_activity(activity_id: int, body: ActivityUpdate, db: Session = Depends(get_db)):
    a = db.query(ActivityDB).filter(ActivityDB.id == activity_id).first()
    if not a:
        raise HTTPException(404, "Activity not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(a, field, value)
    db.commit()
    return {"id": a.id, "status": a.status}


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------
@app.get("/api/activities/{activity_id}/comments")
def list_comments(activity_id: int, db: Session = Depends(get_db)):
    comments = db.query(CommentDB).filter(CommentDB.activity_id == activity_id).order_by(CommentDB.created_at).all()
    return [
        {
            "id": c.id, "activity_id": c.activity_id, "author": c.author,
            "department": c.department, "content": c.content,
            "status": c.status, "approved_by": c.approved_by,
            "approved_at": c.approved_at.isoformat() if c.approved_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in comments
    ]


@app.post("/api/activities/{activity_id}/comments")
def add_comment(activity_id: int, body: CommentCreate, db: Session = Depends(get_db)):
    a = db.query(ActivityDB).filter(ActivityDB.id == activity_id).first()
    if not a:
        raise HTTPException(404, "Activity not found")
    c = CommentDB(activity_id=activity_id, **body.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "status": c.status}


@app.patch("/api/comments/{comment_id}/approve")
def approve_comment(comment_id: int, body: CommentApprove, db: Session = Depends(get_db)):
    c = db.query(CommentDB).filter(CommentDB.id == comment_id).first()
    if not c:
        raise HTTPException(404, "Comment not found")
    c.status = "approved"
    c.approved_by = body.approved_by
    c.approved_at = datetime.utcnow()
    db.commit()

    # Ingest into RAG
    act = db.query(ActivityDB).filter(ActivityDB.id == c.activity_id).first()
    _ingest_to_rag(
        db, "comment", c.id, act.project_id if act else 0,
        f"[Activity: {act.name if act else 'Unknown'}] {c.content}",
        {
            "author": c.author, "department": c.department,
            "activity_id": c.activity_id, "project_id": act.project_id if act else 0,
            "approved_at": c.approved_at.isoformat(),
        },
    )
    return {"id": c.id, "status": c.status}


@app.patch("/api/comments/{comment_id}/reject")
def reject_comment(comment_id: int, db: Session = Depends(get_db)):
    c = db.query(CommentDB).filter(CommentDB.id == comment_id).first()
    if not c:
        raise HTTPException(404, "Comment not found")
    c.status = "rejected"
    db.commit()
    return {"id": c.id, "status": c.status}


# ---------------------------------------------------------------------------
# Documents (MoM + PO)
# ---------------------------------------------------------------------------
@app.get("/api/projects/{project_id}/documents")
def list_documents(project_id: int, db: Session = Depends(get_db)):
    docs = db.query(DocumentDB).filter(DocumentDB.project_id == project_id).order_by(DocumentDB.created_at.desc()).all()
    return [
        {
            "id": d.id, "project_id": d.project_id, "activity_id": d.activity_id,
            "doc_type": d.doc_type, "filename": d.filename, "uploaded_by": d.uploaded_by,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]


@app.post("/api/documents/upload")
async def upload_document(
    project_id: int = Form(...),
    doc_type: str = Form(...),
    uploaded_by: str = Form(""),
    activity_id: Optional[int] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Save file
    safe_name = f"{project_id}_{doc_type}_{int(datetime.utcnow().timestamp())}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, safe_name)
    with open(filepath, "wb") as buf:
        shutil.copyfileobj(file.file, buf)

    # Extract text
    content_text = _extract_text_from_file(filepath, file.filename)

    doc = DocumentDB(
        project_id=project_id,
        activity_id=activity_id,
        doc_type=doc_type,
        filename=file.filename,
        filepath=filepath,
        uploaded_by=uploaded_by,
        content_text=content_text,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Ingest into RAG
    _ingest_to_rag(
        db, doc_type, doc.id, project_id,
        content_text or f"[{doc_type.upper()}] {file.filename}",
        {
            "filename": file.filename, "doc_type": doc_type,
            "project_id": project_id, "uploaded_by": uploaded_by,
            "uploaded_at": doc.created_at.isoformat(),
        },
    )
    return {"id": doc.id, "filename": file.filename, "doc_type": doc_type}


@app.get("/api/documents/{document_id}/view")
def view_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(DocumentDB).filter(DocumentDB.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    if not os.path.exists(doc.filepath):
        raise HTTPException(404, "File not found on disk")
    media_type = "application/pdf" if doc.filename.lower().endswith(".pdf") else "application/octet-stream"
    return FileResponse(doc.filepath, media_type=media_type, filename=doc.filename)


# ---------------------------------------------------------------------------
# Drawings (SolidWorks links)
# ---------------------------------------------------------------------------
@app.get("/api/activities/{activity_id}/drawings")
def list_drawings(activity_id: int, db: Session = Depends(get_db)):
    drawings = db.query(DrawingDB).filter(DrawingDB.activity_id == activity_id).all()
    return [
        {
            "id": d.id, "activity_id": d.activity_id, "sw_path": d.sw_path,
            "drawing_number": d.drawing_number, "revision": d.revision,
            "description": d.description,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in drawings
    ]


@app.post("/api/activities/{activity_id}/drawings")
def link_drawing(activity_id: int, body: DrawingCreate, db: Session = Depends(get_db)):
    d = DrawingDB(activity_id=activity_id, **body.model_dump())
    db.add(d)
    db.commit()
    db.refresh(d)
    return {"id": d.id, "drawing_number": d.drawing_number}


# ---------------------------------------------------------------------------
# Emails (Outlook links)
# ---------------------------------------------------------------------------
@app.get("/api/projects/{project_id}/emails")
def list_emails(project_id: int, db: Session = Depends(get_db)):
    emails = db.query(EmailDB).filter(EmailDB.project_id == project_id).order_by(EmailDB.email_date.desc()).all()
    return [
        {
            "id": e.id, "project_id": e.project_id, "activity_id": e.activity_id,
            "subject": e.subject, "sender": e.sender, "recipients": e.recipients or [],
            "body": e.body, "email_date": e.email_date, "linked_by": e.linked_by,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in emails
    ]


@app.post("/api/projects/{project_id}/emails")
def link_email(project_id: int, body: EmailCreate, db: Session = Depends(get_db)):
    e = EmailDB(project_id=project_id, **body.model_dump())
    db.add(e)
    db.commit()
    db.refresh(e)

    # Ingest into RAG
    content = f"Subject: {e.subject}\nFrom: {e.sender}\nDate: {e.email_date}\n\n{e.body}"
    _ingest_to_rag(
        db, "email", e.id, project_id, content,
        {
            "subject": e.subject, "sender": e.sender,
            "date": e.email_date, "project_id": project_id,
        },
    )
    return {"id": e.id, "subject": e.subject}


# ---------------------------------------------------------------------------
# RAG Endpoints
# ---------------------------------------------------------------------------
@app.post("/api/rag/query")
def rag_query(body: RAGQuery, db: Session = Depends(get_db)):
    if rag_engine._dirty:
        rag_engine.load_from_db(db)
    results = rag_engine.retrieve(body.question, body.project_id, body.top_k)
    answer = rag_engine.generate_answer(body.question, results)
    return {
        "question": body.question,
        "answer": answer,
        "sources": results,
        "source_count": len(results),
    }


@app.post("/api/rag/reconstruct")
def rag_reconstruct(body: RAGQuery, db: Session = Depends(get_db)):
    if rag_engine._dirty:
        rag_engine.load_from_db(db)
    answer = rag_engine.reconstruct_context(body.question, body.project_id, db)
    return {"topic": body.question, "reconstruction": answer}


@app.post("/api/rag/reindex")
def rag_reindex(db: Session = Depends(get_db)):
    rag_engine.load_from_db(db)
    return {"message": f"Re-indexed {len(rag_engine.documents)} documents"}


@app.get("/api/rag/stats")
def rag_stats(db: Session = Depends(get_db)):
    total = db.query(RAGDocumentDB).count()
    by_type = {}
    for row in db.query(RAGDocumentDB).all():
        by_type[row.source_type] = by_type.get(row.source_type, 0) + 1
    return {"total_documents": total, "by_type": by_type}


# ---------------------------------------------------------------------------
# Serve uploaded files directly (for viewing)
# ---------------------------------------------------------------------------
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
