from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database.session import get_db, init_db
from app.database.models import (
    User, ChatSession, ChatMessage, TaxReturn, W2Form, Form1099, Deduction, Credit
)
from app.schemas.api import (
    CreateUserRequest, UserResponse,
    CreateSessionRequest, SessionResponse,
    ChatRequest, ChatResponse,
    PDFUploadResponse,
    SessionStatusResponse,
    SubmitTaxesRequest, SubmitTaxesResponse, SectionResult,
    RetrySectionRequest,
    UserDataResponse,
)
from app.services.chat_agent import run_chat_turn
from app.services.pdf_parser import parse_tax_pdf
from app.services.browser_agent import run_submission, run_section
from app.services.field_loader import get_all_required_fields


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="April Tax Filing API", version="0.1.0", lifespan=lifespan)


# ── POST /users ────────────────────────────────────────────────────────────
@app.post("/users", response_model=UserResponse)
def create_user(body: CreateUserRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter_by(email=body.email).first()
    if existing:
        return UserResponse(user_id=existing.id, email=existing.email)
    user = User(email=body.email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserResponse(user_id=user.id, email=user.email)


# ── POST /sessions ─────────────────────────────────────────────────────────
@app.post("/sessions", response_model=SessionResponse)
def create_session(body: CreateSessionRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    session = ChatSession(user_id=body.user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return SessionResponse(session_id=session.id, user_id=session.user_id, status=session.status)


# ── POST /chat ─────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter_by(id=body.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    result = await run_chat_turn(db, session, body.message)
    return ChatResponse(**result)


# ── POST /upload-pdf ───────────────────────────────────────────────────────
@app.post("/upload-pdf", response_model=PDFUploadResponse)
async def upload_pdf(
    session_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    session = db.query(ChatSession).filter_by(id=session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    pdf_bytes = await file.read()
    extracted = await parse_tax_pdf(pdf_bytes)
    form_type = extracted.get("form_type", "unknown")
    fields = extracted.get("fields", extracted)
    user_id = session.user_id

    # Persist extracted data
    if form_type == "W-2":
        w2 = W2Form(user_id=user_id)
        for k, v in fields.items():
            if hasattr(w2, k):
                setattr(w2, k, v)
        db.add(w2)
    elif form_type.startswith("1099"):
        f1099 = Form1099(
            user_id=user_id,
            form_type=form_type.replace("1099-", ""),
            raw_json=fields,
        )
        for k, v in fields.items():
            if hasattr(f1099, k):
                setattr(f1099, k, v)
        db.add(f1099)
    db.commit()

    # Notify the chat session that a PDF was uploaded
    note = f"[System: User uploaded a {form_type} PDF. Fields extracted: {list(fields.keys())}]"
    db.add(ChatMessage(session_id=session_id, role="user", content=note))
    db.commit()

    return PDFUploadResponse(form_type=form_type, extracted_fields=fields, saved=True)


# ── GET /sessions/{session_id}/status ─────────────────────────────────────
@app.get("/sessions/{session_id}/status", response_model=SessionStatusResponse)
def session_status(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter_by(id=session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_id = session.user_id
    required = get_all_required_fields()
    missing = []

    tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
    w2s = db.query(W2Form).filter_by(user_id=user_id).all()
    f1099s = db.query(Form1099).filter_by(user_id=user_id).all()
    ded = db.query(Deduction).filter_by(user_id=user_id).first()
    cred = db.query(Credit).filter_by(user_id=user_id).first()

    for field in required:
        field_id = field["id"]
        section = field["section"].lower()

        found = False
        if "personal" in section or "bank" in section or "refund" in section:
            found = tr is not None and getattr(tr, field_id, None) is not None
        elif "w-2" in section or "w2" in section:
            found = len(w2s) > 0
        elif "1099" in section:
            found = len(f1099s) > 0
        elif "deduction" in section:
            found = ded is not None
        elif "credit" in section:
            found = cred is not None

        if not found:
            missing.append(f"{field['section']}.{field_id}")

    total = len(required)
    collected = total - len(missing)
    percent = round((collected / total * 100) if total > 0 else 100.0, 1)

    if not missing and session.status != "complete":
        session.status = "complete"
        db.commit()

    return SessionStatusResponse(
        status=session.status,
        missing_fields=missing,
        percent_complete=percent,
    )


# ── POST /submit-taxes ─────────────────────────────────────────────────────
@app.post("/submit-taxes", response_model=SubmitTaxesResponse)
async def submit_taxes(body: SubmitTaxesRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    raw_results = await run_submission(db, body.user_id)
    results = [SectionResult(**r) for r in raw_results]
    overall = all(r.success for r in results)
    return SubmitTaxesResponse(results=results, overall_success=overall)


# ── POST /retry-section ────────────────────────────────────────────────────
@app.post("/retry-section", response_model=SectionResult)
async def retry_section(body: RetrySectionRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    result = await run_section(db, body.user_id, body.section_name)
    return SectionResult(**result)


# ── GET /users/{user_id}/data ──────────────────────────────────────────────
@app.get("/users/{user_id}/data", response_model=UserDataResponse)
def get_user_data(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    def row_to_dict(obj):
        if obj is None:
            return None
        return {
            c.name: getattr(obj, c.name)
            for c in obj.__table__.columns
        }

    tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
    w2s = db.query(W2Form).filter_by(user_id=user_id).all()
    f1099s = db.query(Form1099).filter_by(user_id=user_id).all()
    ded = db.query(Deduction).filter_by(user_id=user_id).first()
    cred = db.query(Credit).filter_by(user_id=user_id).first()

    return UserDataResponse(
        user_id=user.id,
        email=user.email,
        tax_return=row_to_dict(tr),
        w2_forms=[row_to_dict(w) for w in w2s],
        form_1099s=[row_to_dict(f) for f in f1099s],
        deductions=row_to_dict(ded),
        credits=row_to_dict(cred),
    )
