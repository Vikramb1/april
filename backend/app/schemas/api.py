from pydantic import BaseModel
from typing import Any, Optional


# ── Users ──────────────────────────────────────────────────────────────────
class CreateUserRequest(BaseModel):
    email: str


class UserResponse(BaseModel):
    user_id: int
    email: str


# ── Sessions ───────────────────────────────────────────────────────────────
class CreateSessionRequest(BaseModel):
    user_id: int


class SessionResponse(BaseModel):
    session_id: int
    user_id: int
    status: str


# ── Chat ───────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    session_id: int
    message: str


class ChatResponse(BaseModel):
    reply: str
    request_pdf_upload: bool = False
    pdf_upload_reason: Optional[str] = None
    session_status: str


# ── PDF Upload ─────────────────────────────────────────────────────────────
class PDFUploadResponse(BaseModel):
    form_type: str
    extracted_fields: dict[str, Any]
    saved: bool


# ── Session Status ─────────────────────────────────────────────────────────
class SessionStatusResponse(BaseModel):
    status: str
    missing_fields: list[str]
    percent_complete: float


# ── Submit Taxes ───────────────────────────────────────────────────────────
class SubmitTaxesRequest(BaseModel):
    user_id: int


class SectionResult(BaseModel):
    section_name: str
    success: bool
    error: Optional[str] = None


class SubmitTaxesResponse(BaseModel):
    results: list[SectionResult]
    overall_success: bool


# ── Retry Section ──────────────────────────────────────────────────────────
class RetrySectionRequest(BaseModel):
    user_id: int
    section_name: str


# ── User Data ──────────────────────────────────────────────────────────────
class UserDataResponse(BaseModel):
    user_id: int
    email: str
    tax_return: Optional[dict[str, Any]] = None
    w2_forms: list[dict[str, Any]] = []
    form_1099s: list[dict[str, Any]] = []
    deductions: Optional[dict[str, Any]] = None
    credits: Optional[dict[str, Any]] = None


# ── Update Data ────────────────────────────────────────────────────────────
class UpdateDataRequest(BaseModel):
    tax_return: Optional[dict[str, Any]] = None
    w2_forms: Optional[list[dict[str, Any]]] = None
    form_1099s: Optional[list[dict[str, Any]]] = None
    deductions: Optional[dict[str, Any]] = None
    credits: Optional[dict[str, Any]] = None


# ── Gusto W-2 Fetch ──────────────────────────────────────────────────
class GustoLoginRequest(BaseModel):
    user_id: int


class GustoLoginResponse(BaseModel):
    profile_id: str
    session_id: str
    live_url: str
    message: str


class CompleteGustoLoginRequest(BaseModel):
    session_id: str
    profile_id: str


class CompleteGustoLoginResponse(BaseModel):
    success: bool
    output: str
    profile_id: str


class FetchGustoW2Request(BaseModel):
    user_id: int
    session_id: str


class FetchGustoW2Response(BaseModel):
    form_type: str
    extracted_fields: dict[str, Any]
    saved: bool
    w2_id: int
