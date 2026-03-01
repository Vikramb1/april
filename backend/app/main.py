from contextlib import asynccontextmanager
import asyncio
import io
import json
from datetime import datetime, timezone

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
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


# ── Filing event bus (in-memory, per-user queues for SSE) ──────────────────
_filing_events: dict[int, list[dict]] = {}  # user_id -> list of events
_filing_waiters: dict[int, list[asyncio.Event]] = {}  # user_id -> list of asyncio.Events to notify


def _emit_filing_event(user_id: int, event: dict):
    """Push an event to the user's filing stream."""
    _filing_events.setdefault(user_id, []).append(event)
    for waiter in _filing_waiters.get(user_id, []):
        waiter.set()


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

    result = await run_chat_turn(db, session, body.message, active_section=body.active_section)
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
@app.post("/submit-taxes")
async def submit_taxes(body: SubmitTaxesRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Clear previous events and start submission in background
    _filing_events[body.user_id] = []

    async def _run_filing(user_id: int):
        import logging
        log = logging.getLogger("uvicorn")
        log.info(f"[filing] Background task started for user {user_id}")
        from app.services.browser_agent import run_submission
        from app.database.session import SessionLocal
        bg_db = SessionLocal()
        try:
            results = await run_submission(bg_db, user_id, on_section_done=lambda evt: _emit_filing_event(user_id, evt))
            overall = all(r["success"] for r in results)
            log.info(f"[filing] Completed for user {user_id}, overall={overall}")
            _emit_filing_event(user_id, {
                "type": "complete",
                "overall_success": overall,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        except Exception as e:
            log.error(f"[filing] Error for user {user_id}: {e}", exc_info=True)
            _emit_filing_event(user_id, {
                "type": "error",
                "message": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        finally:
            bg_db.close()

    asyncio.create_task(_run_filing(body.user_id))
    return {"status": "started", "user_id": body.user_id}


# ── GET /filing-stream/{user_id} (SSE) ────────────────────────────────────
@app.get("/filing-stream/{user_id}")
async def filing_stream(user_id: int):
    async def event_generator():
        cursor = 0
        waiter = asyncio.Event()
        _filing_waiters.setdefault(user_id, []).append(waiter)
        try:
            while True:
                events = _filing_events.get(user_id, [])
                while cursor < len(events):
                    evt = events[cursor]
                    cursor += 1
                    yield f"data: {json.dumps(evt)}\n\n"
                    if evt.get("type") in ("complete", "error", "timeout"):
                        return
                waiter.clear()
                try:
                    await asyncio.wait_for(waiter.wait(), timeout=120)
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'timeout'})}\n\n"
                    return
        finally:
            _filing_waiters.get(user_id, []).remove(waiter)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "http://localhost:3000",
        },
    )


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

    # Check for existing saved W-2 data first (any user — for dev/demo)
    import json as _json
    existing_w2 = db.query(W2Form).filter(W2Form.extra_data.isnot(None)).order_by(W2Form.id.desc()).first()
    if existing_w2 and existing_w2.extra_data:
        fields = _json.loads(existing_w2.extra_data) if isinstance(existing_w2.extra_data, str) else existing_w2.extra_data
        return FetchGustoW2Response(
            form_type="W-2",
            extracted_fields=fields,
            saved=True,
            w2_id=existing_w2.id,
        )

    # No saved data — try browser automation
    from app.services.gusto_agent import start_gusto_w2_task, get_gusto_w2_result
    task_info = await start_gusto_w2_task()
    import logging
    logging.getLogger("uvicorn").info(
        f"Gusto live URL (enter MFA here if needed): {task_info['live_url']}"
    )

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

    # Check for existing saved 1099 data first (any user — for dev/demo)
    import json as _json
    existing_1099 = db.query(Form1099).filter(Form1099.raw_json.isnot(None)).order_by(Form1099.id.desc()).first()
    if existing_1099 and existing_1099.raw_json:
        fields = _json.loads(existing_1099.raw_json) if isinstance(existing_1099.raw_json, str) else existing_1099.raw_json
        form_type = f"1099-{existing_1099.form_type}" if existing_1099.form_type else "1099"
        return FetchFidelity1099Response(
            form_type=form_type,
            extracted_fields=fields,
            saved=True,
            form_1099_id=existing_1099.id,
        )

    # No saved data — try browser automation
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


# ── POST /upload-w2-pdf ────────────────────────────────────────────────────
@app.post("/upload-w2-pdf")
async def upload_w2_pdf(
    user_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a W-2 PDF, parse it with AI, and return extracted fields."""
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pdf_bytes = await file.read()
    extracted = await parse_tax_pdf(pdf_bytes)
    form_type = extracted.get("form_type", "unknown")
    fields = extracted.get("fields", extracted)

    return {"form_type": form_type, "extracted_fields": fields}


# ── POST /upload-1099-pdf ─────────────────────────────────────────────────
@app.post("/upload-1099-pdf")
async def upload_1099_pdf(
    user_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload a 1099 PDF, parse it with AI, and return extracted fields."""
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    pdf_bytes = await file.read()
    extracted = await parse_tax_pdf(pdf_bytes)
    form_type = extracted.get("form_type", "unknown")
    fields = extracted.get("fields", extracted)

    return {"form_type": form_type, "extracted_fields": fields}


# ── GET /users/{user_id}/tax-pdf ────────────────────────────────────────────
@app.get("/users/{user_id}/tax-pdf")
def generate_tax_pdf(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(id=user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
    w2s = db.query(W2Form).filter_by(user_id=user_id).all()
    f1099s = db.query(Form1099).filter_by(user_id=user_id).all()
    ded = db.query(Deduction).filter_by(user_id=user_id).first()
    cred = db.query(Credit).filter_by(user_id=user_id).first()

    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=0.6*inch, bottomMargin=0.6*inch,
                            leftMargin=0.75*inch, rightMargin=0.75*inch)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title2', parent=styles['Title'], fontSize=20, spaceAfter=4)
    subtitle_style = ParagraphStyle('Sub', parent=styles['Normal'], fontSize=10, textColor=colors.grey, spaceAfter=12)
    section_style = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=14, spaceBefore=16, spaceAfter=6,
                                   textColor=colors.HexColor('#1a1a1a'))
    label_style = ParagraphStyle('Label', parent=styles['Normal'], fontSize=9, textColor=colors.grey)
    value_style = ParagraphStyle('Value', parent=styles['Normal'], fontSize=11)

    story = []

    # Header
    story.append(Paragraph("Tax Return Summary", title_style))
    story.append(Paragraph(f"Prepared for {user.email} &bull; Tax Year 2025", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e5e5'), spaceAfter=12))

    def add_section(title):
        story.append(Paragraph(title, section_style))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e5e5e5'), spaceAfter=8))

    def add_field_table(fields):
        """fields: list of (label, value) tuples"""
        data = []
        for label, val in fields:
            if val is None or val == '':
                val = '—'
            data.append([
                Paragraph(str(label), label_style),
                Paragraph(str(val), value_style),
            ])
        if not data:
            return
        t = Table(data, colWidths=[2.8*inch, 4*inch])
        t.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LINEBELOW', (0, 0), (-1, -1), 0.25, colors.HexColor('#f0f0f0')),
        ]))
        story.append(t)
        story.append(Spacer(1, 6))

    def fmt_money(v):
        if v is None:
            return '—'
        try:
            return f"${float(v):,.2f}"
        except (ValueError, TypeError):
            return str(v)

    # Personal Information
    if tr:
        add_section("Personal Information")
        d = _row_to_dict(tr, _TR_RENAMES) or {}
        add_field_table([
            ("First Name", d.get('first_name')),
            ("Last Name", d.get('last_name')),
            ("SSN", d.get('ssn')),
            ("Date of Birth", d.get('date_of_birth') or d.get('dob')),
            ("Address", d.get('address')),
            ("Filing Status", d.get('filing_status')),
            ("Occupation", d.get('occupation')),
        ])

    # W-2 Forms
    if w2s:
        add_section(f"W-2 Income ({len(w2s)} form{'s' if len(w2s) > 1 else ''})")
        for i, w2 in enumerate(w2s):
            wd = _row_to_dict(w2, _W2_RENAMES) or {}
            if len(w2s) > 1:
                story.append(Paragraph(f"W-2 #{i+1}", ParagraphStyle('W2Num', parent=styles['Normal'],
                             fontSize=11, fontName='Helvetica-Bold', spaceBefore=8, spaceAfter=4)))
            add_field_table([
                ("Employer", wd.get('employer_name')),
                ("EIN", wd.get('ein')),
                ("Wages (Box 1)", fmt_money(wd.get('wages'))),
                ("Federal Tax Withheld (Box 2)", fmt_money(wd.get('federal_tax_withheld'))),
                ("SS Wages (Box 3)", fmt_money(wd.get('social_security_wages'))),
                ("SS Tax Withheld (Box 4)", fmt_money(wd.get('social_security_tax_withheld'))),
                ("Medicare Wages (Box 5)", fmt_money(wd.get('medicare_wages'))),
                ("Medicare Tax Withheld (Box 6)", fmt_money(wd.get('medicare_tax_withheld'))),
                ("State", wd.get('state')),
                ("State Wages (Box 16)", fmt_money(wd.get('state_wages'))),
                ("State Tax Withheld (Box 17)", fmt_money(wd.get('state_tax_withheld'))),
            ])

    # 1099 Forms
    if f1099s:
        add_section(f"1099 Income ({len(f1099s)} form{'s' if len(f1099s) > 1 else ''})")
        for i, f in enumerate(f1099s):
            fd = _row_to_dict(f) or {}
            if len(f1099s) > 1:
                story.append(Paragraph(f"1099-{f.form_type or '?'} #{i+1}", ParagraphStyle('F1099Num',
                             parent=styles['Normal'], fontSize=11, fontName='Helvetica-Bold',
                             spaceBefore=8, spaceAfter=4)))
            fields = [("Payer", fd.get('payer_name')), ("Form Type", f"1099-{f.form_type or '?'}")]
            # Add all numeric fields from raw_json
            raw = f.raw_json if isinstance(f.raw_json, dict) else {}
            for k, v in raw.items():
                if k in ('form_type', 'payer_name', 'payer_tin'):
                    continue
                if isinstance(v, dict):
                    for sk, sv in v.items():
                        if isinstance(sv, (int, float)) and sv != 0:
                            fields.append((sk.replace('_', ' ').title(), fmt_money(sv)))
                elif isinstance(v, (int, float)) and v != 0:
                    fields.append((k.replace('_', ' ').title(), fmt_money(v)))
            add_field_table(fields)

    # Deductions
    add_section("Deductions")
    if ded:
        dd = _deduction_to_dict(ded) or {}
        items = [(k.replace('_', ' ').title(), fmt_money(v)) for k, v in dd.items()
                 if v is not None and v != 0]
        if items:
            add_field_table(items)
        else:
            story.append(Paragraph("Standard deduction", value_style))
    else:
        story.append(Paragraph("Standard deduction", value_style))

    # Credits
    add_section("Credits")
    if cred:
        cd = _credit_to_dict(cred) or {}
        items = [(k.replace('_', ' ').title(), str(v)) for k, v in cd.items()
                 if v is not None and v != 0]
        if items:
            add_field_table(items)
        else:
            story.append(Paragraph("No credits claimed", value_style))
    else:
        story.append(Paragraph("No credits claimed", value_style))

    # Bank Info
    if tr:
        d = _row_to_dict(tr, _TR_RENAMES) or {}
        routing = d.get('bank_routing_number')
        account = d.get('bank_account_number')
        if routing or account:
            add_section("Direct Deposit")
            add_field_table([
                ("Routing Number", routing),
                ("Account Number", account),
            ])

    # Other Income
    if tr and tr.other_income:
        add_section("Other Income")
        items = [(k.replace('_', ' ').title(), str(v)) for k, v in tr.other_income.items()
                 if v is not None]
        add_field_table(items)

    # State Info
    if tr and tr.state_info:
        add_section("State Information")
        items = [(k.replace('_', ' ').title(), str(v)) for k, v in tr.state_info.items()
                 if v is not None]
        add_field_table(items)

    # Dependents
    if tr and tr.dependents:
        add_section(f"Dependents ({len(tr.dependents)})")
        for i, dep in enumerate(tr.dependents):
            story.append(Paragraph(f"Dependent #{i+1}", ParagraphStyle('DepNum', parent=styles['Normal'],
                         fontSize=11, fontName='Helvetica-Bold', spaceBefore=6, spaceAfter=4)))
            items = [(k.replace('_', ' ').title(), str(v)) for k, v in dep.items() if v is not None]
            add_field_table(items)

    # Misc Info
    if tr and tr.misc_info:
        add_section("Miscellaneous")
        items = [(k.replace('_', ' ').title(), str(v)) for k, v in tr.misc_info.items()
                 if v is not None]
        add_field_table(items)

    doc.build(story)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=tax-return-2025.pdf"},
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
