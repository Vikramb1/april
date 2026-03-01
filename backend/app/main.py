from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
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
    UpdateDataRequest,
    FetchGustoW2Request, FetchGustoW2Response,
    FetchFidelity1099Request, FetchFidelity1099Response,
)
from app.services.chat_agent import run_chat_turn
from app.services.pdf_parser import parse_tax_pdf
from app.services.field_loader import get_all_required_fields


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="April Tax Filing API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

    from app.services.browser_agent import run_submission
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

    from app.services.browser_agent import run_section
    result = await run_section(db, body.user_id, body.section_name)
    return SectionResult(**result)


# Columns excluded from _row_to_dict — returned separately or binary/internal only
_EXCLUDE_COLS = {
    'extra_data', 'raw_json', 'pdf_data', 'created_at', 'updated_at', 'user_id',
    'other_income', 'dependents', 'misc_info', 'state_info',  # returned as top-level fields
}

# DB column name → TypeScript interface field name renames
_TR_RENAMES = {
    'dob': 'date_of_birth',
    'direct_deposit_routing': 'bank_routing_number',
    'direct_deposit_account': 'bank_account_number',
}
_W2_RENAMES = {
    'federal_withheld': 'federal_tax_withheld',
    'ss_withheld': 'social_security_tax_withheld',
    'medicare_withheld': 'medicare_tax_withheld',
    'state_withheld': 'state_tax_withheld',
    'local_withheld': 'local_tax',
    'box12_code': 'box12_code1',
    'box12_amount': 'box12_amount1',
}

# Shared helper: merge explicit columns (renamed) with JSON overflow field
# Checks extra_data first (TaxReturn, W2Form), then raw_json (Form1099)
def _row_to_dict(obj, col_renames: dict | None = None):
    if obj is None:
        return None
    base = {}
    for c in obj.__table__.columns:
        if c.name in _EXCLUDE_COLS:
            continue
        key = (col_renames or {}).get(c.name, c.name)
        base[key] = getattr(obj, c.name)
    # Use extra_data if present, otherwise fall back to raw_json (Form1099)
    extra = getattr(obj, 'extra_data', None) or getattr(obj, 'raw_json', None) or {}
    if not isinstance(extra, dict):
        extra = {}
    return {**base, **extra}


def _deduction_to_dict(ded) -> dict | None:
    """Merge Deduction DB columns (with renames) + other_json. other_json wins on conflict."""
    if ded is None:
        return None
    base = {
        'mortgage_interest': ded.mortgage_interest,
        'cash_donations': ded.charitable_cash,       # rename: charitable_cash → cash_donations
        'student_loan_interest': ded.student_loan_interest,
    }
    other = ded.other_json or {}
    # Merge: other_json wins; drop None base values so they don't clobber existing other_json data
    result = {k: v for k, v in base.items() if v is not None}
    result.update(other)
    return result


def _credit_to_dict(cred) -> dict | None:
    """Merge Credit DB columns (with renames) + other_json. other_json wins on conflict."""
    if cred is None:
        return None
    base = {
        'eic_qualifying_children': cred.eitc_qualifying_children,  # rename
    }
    other = cred.other_json or {}
    result = {k: v for k, v in base.items() if v is not None}
    result.update(other)
    return result


# ── GET /users/{user_id}/data ──────────────────────────────────────────────
@app.get("/users/{user_id}/data", response_model=UserDataResponse)
def get_user_data(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
    w2s = db.query(W2Form).filter_by(user_id=user_id).all()
    f1099s = db.query(Form1099).filter_by(user_id=user_id).all()
    ded = db.query(Deduction).filter_by(user_id=user_id).first()
    cred = db.query(Credit).filter_by(user_id=user_id).first()

    return UserDataResponse(
        user_id=user.id,
        email=user.email,
        tax_return=_row_to_dict(tr, _TR_RENAMES),
        w2_forms=[_row_to_dict(w, _W2_RENAMES) for w in w2s],
        form_1099s=[_row_to_dict(f) for f in f1099s],
        deductions=_deduction_to_dict(ded),
        credits=_credit_to_dict(cred),
        other_income=tr.other_income if tr else None,
        dependents=tr.dependents or [] if tr else [],
        misc_info=tr.misc_info if tr else None,
        state_info=tr.state_info if tr else None,
    )


# ── POST /fetch-gusto-w2 ─────────────────────────────────────────────
@app.post("/fetch-gusto-w2", response_model=FetchGustoW2Response)
async def fetch_gusto_w2(body: FetchGustoW2Request, db: Session = Depends(get_db)):
    """Fetch W-2 from Gusto via browser automation.

    Starts a browser-use cloud task that logs into Gusto (if needed),
    navigates to Recent Documents, and downloads the W-2 PDF.
    If MFA is required, enter the code at the live_url logged to console.
    """
    user = db.query(User).filter_by(id=body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Start the task and get live_url + task_id
    from app.services.gusto_agent import start_gusto_w2_task, get_gusto_w2_result
    task_info = await start_gusto_w2_task()
    import logging
    logging.getLogger("uvicorn").info(
        f"Gusto live URL (enter MFA here if needed): {task_info['live_url']}"
    )

    # Wait for the task to complete and get PDF bytes
    try:
        pdf_bytes = await get_gusto_w2_result(task_info["task_id"])
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    extracted = await parse_tax_pdf(pdf_bytes)
    form_type = extracted.get("form_type", "unknown")
    fields = extracted.get("fields", extracted)

    if form_type != "W-2":
        raise HTTPException(
            status_code=422,
            detail=f"Expected W-2 but parsed as {form_type}",
        )

    w2 = W2Form(user_id=body.user_id)
    for k, v in fields.items():
        if hasattr(w2, k) and k not in ("id", "user_id", "created_at", "updated_at", "extra_data", "pdf_data"):
            setattr(w2, k, v)
    w2.extra_data = fields
    w2.pdf_data = pdf_bytes
    db.add(w2)
    db.commit()
    db.refresh(w2)

    return FetchGustoW2Response(
        form_type=form_type,
        extracted_fields=fields,
        saved=True,
        w2_id=w2.id,
    )


# ── POST /fetch-fidelity-1099 ──────────────────────────────────────────
@app.post("/fetch-fidelity-1099", response_model=FetchFidelity1099Response)
async def fetch_fidelity_1099(body: FetchFidelity1099Request, db: Session = Depends(get_db)):
    """Fetch consolidated 1099 from Fidelity via browser automation.

    Starts a browser-use cloud task that logs into Fidelity (if needed),
    navigates to Tax Forms, and downloads the 1099 PDF.
    If MFA is required, enter the code at the live_url logged to console.
    """
    user = db.query(User).filter_by(id=body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    from app.services.fidelity_agent import start_fidelity_1099_task, get_fidelity_1099_result
    task_info = await start_fidelity_1099_task()
    import logging
    logging.getLogger("uvicorn").info(
        f"Fidelity live URL (enter MFA here if needed): {task_info['live_url']}"
    )

    try:
        pdf_bytes = await get_fidelity_1099_result(task_info["task_id"])
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    extracted = await parse_tax_pdf(pdf_bytes)
    form_type = extracted.get("form_type", "unknown")
    fields = extracted.get("fields", extracted)

    f1099 = Form1099(
        user_id=body.user_id,
        form_type=form_type.replace("1099-", ""),
        raw_json=fields,
        pdf_data=pdf_bytes,
    )
    for k, v in fields.items():
        if hasattr(f1099, k) and k not in ("id", "user_id", "created_at", "updated_at", "raw_json", "pdf_data", "form_type"):
            setattr(f1099, k, v)
    db.add(f1099)
    db.commit()
    db.refresh(f1099)

    return FetchFidelity1099Response(
        form_type=form_type,
        extracted_fields=fields,
        saved=True,
        form_1099_id=f1099.id,
    )


# ── PUT /users/{user_id}/data ──────────────────────────────────────────────
@app.put("/users/{user_id}/data", response_model=UserDataResponse)
def update_user_data(user_id: int, body: UpdateDataRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Always upsert TaxReturn — it anchors all supplementary JSON fields
    tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
    if tr is None:
        tr = TaxReturn(user_id=user_id)
        db.add(tr)

    if body.tax_return is not None:
        # Sync known explicit columns (backend field name mappings)
        col_map = {
            'first_name': 'first_name',
            'last_name': 'last_name',
            'ssn': 'ssn',
            'date_of_birth': 'dob',
            'address': 'address',
            'occupation': 'occupation',
            'filing_status': 'filing_status',
            'bank_routing_number': 'direct_deposit_routing',
            'bank_account_number': 'direct_deposit_account',
        }
        for fe_key, db_key in col_map.items():
            val = getattr(body.tax_return, fe_key, None)
            if val is not None:
                setattr(tr, db_key, val)
        tr.extra_data = body.tax_return.model_dump(exclude_none=True)

    # Store supplementary data directly on the TaxReturn row
    if body.other_income is not None:
        tr.other_income = body.other_income.model_dump(exclude_none=True)
    if body.dependents is not None:
        tr.dependents = [d.model_dump(exclude_none=True) for d in body.dependents]
    if body.misc_info is not None:
        tr.misc_info = body.misc_info.model_dump(exclude_none=True)
    if body.state_info is not None:
        tr.state_info = body.state_info.model_dump(exclude_none=True)

    # Replace W2 forms wholesale
    if body.w2_forms is not None:
        db.query(W2Form).filter_by(user_id=user_id).delete()
        for w2_data in body.w2_forms:
            w2 = W2Form(user_id=user_id)
            w2_col_map = {
                'employer_name': 'employer_name',
                'ein': 'ein',
                'wages': 'wages',
                'federal_tax_withheld': 'federal_withheld',
                'state_tax_withheld': 'state_withheld',
                'social_security_tax_withheld': 'ss_withheld',
                'medicare_tax_withheld': 'medicare_withheld',
                'state_wages': 'state_wages',
                'local_tax': 'local_withheld',
                'box12_code1': 'box12_code',
                'box12_amount1': 'box12_amount',
            }
            for fe_key, db_key in w2_col_map.items():
                val = getattr(w2_data, fe_key, None)
                if val is not None:
                    setattr(w2, db_key, val)
            w2.extra_data = w2_data.model_dump(exclude_none=True)
            db.add(w2)

    # Replace 1099 forms wholesale
    if body.form_1099s is not None:
        db.query(Form1099).filter_by(user_id=user_id).delete()
        for f_data in body.form_1099s:
            f1099 = Form1099(
                user_id=user_id,
                form_type=f_data.form_type or 'unknown',
                raw_json=f_data.model_dump(exclude_none=True),
            )
            if f_data.payer_name is not None:
                f1099.payer_name = f_data.payer_name
            if f_data.amount is not None:
                f1099.amount = f_data.amount
            db.add(f1099)

    # Upsert Deduction
    if body.deductions is not None:
        ded = db.query(Deduction).filter_by(user_id=user_id).first()
        if ded is None:
            ded = Deduction(user_id=user_id)
            db.add(ded)
        ded.other_json = body.deductions.model_dump(exclude_none=True)

    # Upsert Credit
    if body.credits is not None:
        cred = db.query(Credit).filter_by(user_id=user_id).first()
        if cred is None:
            cred = Credit(user_id=user_id)
            db.add(cred)
        cred.other_json = body.credits.model_dump(exclude_none=True)

    db.commit()

    # Return the full saved state
    tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
    w2s = db.query(W2Form).filter_by(user_id=user_id).all()
    f1099s = db.query(Form1099).filter_by(user_id=user_id).all()
    ded = db.query(Deduction).filter_by(user_id=user_id).first()
    cred = db.query(Credit).filter_by(user_id=user_id).first()

    return UserDataResponse(
        user_id=user.id,
        email=user.email,
        tax_return=_row_to_dict(tr, _TR_RENAMES),
        w2_forms=[_row_to_dict(w, _W2_RENAMES) for w in w2s],
        form_1099s=[_row_to_dict(f) for f in f1099s],
        deductions=_deduction_to_dict(ded),
        credits=_credit_to_dict(cred),
        other_income=tr.other_income if tr else None,
        dependents=tr.dependents or [] if tr else [],
        misc_info=tr.misc_info if tr else None,
        state_info=tr.state_info if tr else None,
    )


# ── DELETE /users/{user_id}/data ───────────────────────────────────────────
@app.delete("/users/{user_id}/data")
def reset_user_data(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.query(TaxReturn).filter_by(user_id=user_id).delete()
    db.query(W2Form).filter_by(user_id=user_id).delete()
    db.query(Form1099).filter_by(user_id=user_id).delete()
    db.query(Deduction).filter_by(user_id=user_id).delete()
    db.query(Credit).filter_by(user_id=user_id).delete()
    db.commit()
    return {"success": True}
