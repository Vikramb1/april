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
    navigate_to_section: Optional[str] = None
    snapshot: Optional[dict] = None   # full user data after saves, for direct UI hydration


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


# ── Typed sub-models (mirror frontend TypeScript interfaces) ────────────────

class TaxReturnData(BaseModel):
    """Mirrors frontend TaxReturn interface."""
    model_config = {"extra": "ignore"}
    id: Optional[int] = None
    # Personal info
    first_name: Optional[str] = None
    middle_initial: Optional[str] = None
    last_name: Optional[str] = None
    suffix: Optional[str] = None
    ssn: Optional[str] = None
    date_of_birth: Optional[str] = None
    occupation: Optional[str] = None
    address: Optional[str] = None
    apt: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    zip_plus_4: Optional[str] = None
    addr_changed: Optional[bool] = None
    filing_status: Optional[str] = None
    claimed_as_dependent: Optional[str] = None
    presidential_fund: Optional[str] = None
    blind: Optional[str] = None
    deceased: Optional[str] = None
    nonresident_alien: Optional[str] = None
    identity_protection_pin: Optional[str] = None
    identity_protection_pin_number: Optional[str] = None
    # Spouse (MFJ)
    spouse_first_name: Optional[str] = None
    spouse_last_name: Optional[str] = None
    spouse_ssn: Optional[str] = None
    spouse_dob: Optional[str] = None
    # Bank & refund
    refund_type: Optional[str] = None
    is_multiple_deposit: Optional[str] = None
    bank_account_nickname: Optional[str] = None
    bank_routing_number: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_type: Optional[str] = None
    bank_is_foreign: Optional[bool] = None
    # Review
    phone_option: Optional[str] = None
    refund_amount: Optional[float] = None
    tax_owed: Optional[float] = None


class W2FormData(BaseModel):
    """Mirrors frontend W2Form interface."""
    model_config = {"extra": "ignore"}
    id: Optional[int] = None
    # Employer
    employer_name: Optional[str] = None
    ein: Optional[str] = None
    employer_address: Optional[str] = None
    employer_city: Optional[str] = None
    employer_state: Optional[str] = None
    employer_zip: Optional[str] = None
    employer_address_type: Optional[str] = None
    # Employee
    employee_name: Optional[str] = None
    employee_address: Optional[str] = None
    employee_city: Optional[str] = None
    employee_state: Optional[str] = None
    employee_zip: Optional[str] = None
    employee_address_type: Optional[str] = None
    # Boxes 1–11
    wages: Optional[float] = None
    federal_tax_withheld: Optional[float] = None
    social_security_wages: Optional[float] = None
    social_security_tax_withheld: Optional[float] = None
    medicare_wages: Optional[float] = None
    medicare_tax_withheld: Optional[float] = None
    social_security_tips: Optional[float] = None
    allocated_tips: Optional[float] = None
    dependent_care_benefits: Optional[float] = None
    nonqualified_plans: Optional[float] = None
    # Box 12
    box12_code1: Optional[str] = None
    box12_amount1: Optional[float] = None
    box12_code2: Optional[str] = None
    box12_amount2: Optional[float] = None
    # Box 13
    statutory_employee: Optional[bool] = None
    retirement_plan: Optional[bool] = None
    third_party_sick_pay: Optional[bool] = None
    # Boxes 14–20
    box14_other: Optional[str] = None
    state: Optional[str] = None
    state_wages: Optional[float] = None
    state_tax_withheld: Optional[float] = None
    local_wages: Optional[float] = None
    local_tax: Optional[float] = None
    local_tax_state: Optional[str] = None
    locality_name: Optional[str] = None
    # W-2 details
    w2_type: Optional[str] = None
    is_corrected: Optional[str] = None
    has_tip_income: Optional[str] = None
    has_overtime: Optional[str] = None


class Form1099Data(BaseModel):
    """Mirrors frontend Form1099 interface."""
    model_config = {"extra": "ignore"}
    id: Optional[int] = None
    form_type: Optional[str] = None
    payer_name: Optional[str] = None
    amount: Optional[float] = None


class DeductionsData(BaseModel):
    """Mirrors frontend Deductions interface."""
    model_config = {"extra": "ignore"}
    standard_deduction: Optional[float] = None
    itemized_deduction: Optional[float] = None
    # Category flags (page 16)
    has_homeowner: Optional[bool] = None
    has_donations: Optional[bool] = None
    has_medical: Optional[bool] = None
    has_taxes_paid: Optional[bool] = None
    has_investment_interest: Optional[bool] = None
    has_casualty: Optional[bool] = None
    has_other_itemized: Optional[bool] = None
    # Homeowner
    mortgage_interest: Optional[float] = None
    property_taxes: Optional[float] = None
    # Donations
    charitable_donations: Optional[float] = None
    cash_donations: Optional[float] = None
    noncash_donations: Optional[float] = None
    # Medical
    medical_expenses: Optional[float] = None
    # Taxes paid
    state_local_income_tax: Optional[float] = None
    state_local_sales_tax: Optional[float] = None
    state_local_taxes: Optional[float] = None
    # Investment interest
    investment_interest: Optional[float] = None
    # Casualty/theft
    casualty_loss: Optional[float] = None
    # Other
    other_itemized: Optional[float] = None


class CreditsData(BaseModel):
    """Mirrors frontend Credits interface."""
    model_config = {"extra": "ignore"}
    # Legacy
    child_tax_credit: Optional[float] = None
    earned_income_credit: Optional[float] = None
    education_credit: Optional[float] = None
    # Health insurance (page 18)
    has_marketplace_insurance: Optional[str] = None
    # Common credits (page 19)
    has_ira: Optional[bool] = None
    ira_amount: Optional[float] = None
    ira_type: Optional[str] = None
    has_college_tuition: Optional[bool] = None
    college_tuition_amount: Optional[float] = None
    has_student_loan: Optional[bool] = None
    student_loan_interest: Optional[float] = None
    has_teacher_expenses: Optional[bool] = None
    teacher_expenses: Optional[float] = None
    has_eic: Optional[bool] = None
    eic_qualifying_children: Optional[int] = None
    has_car_loan: Optional[bool] = None
    car_loan_interest: Optional[float] = None
    has_home_energy: Optional[bool] = None
    home_energy_amount: Optional[float] = None
    has_child_care: Optional[bool] = None
    child_care_expenses: Optional[float] = None
    child_care_qualifying_children: Optional[int] = None
    # Other credits (page 20)
    has_hsa: Optional[bool] = None
    hsa_amount: Optional[float] = None
    has_msa: Optional[bool] = None
    has_adoption: Optional[bool] = None
    adoption_expenses: Optional[float] = None
    has_elderly: Optional[bool] = None
    has_clean_vehicle: Optional[bool] = None
    clean_vehicle_amount: Optional[float] = None
    has_alternative_fuel: Optional[bool] = None
    has_mcc: Optional[bool] = None
    has_employee_business: Optional[bool] = None
    has_military_moving: Optional[bool] = None
    has_claim_of_right: Optional[bool] = None
    has_prior_year_min_tax: Optional[bool] = None
    has_misc_adjustments: Optional[bool] = None


class OtherIncomeData(BaseModel):
    """Mirrors frontend OtherIncome interface (pages 11–13)."""
    model_config = {"extra": "ignore"}
    has_cryptocurrency: Optional[str] = None
    has_investments: Optional[bool] = None
    investment_income: Optional[float] = None
    has_unemployment: Optional[bool] = None
    unemployment_amount: Optional[float] = None
    has_social_security: Optional[bool] = None
    social_security_amount: Optional[float] = None
    has_retirement_income: Optional[bool] = None
    retirement_income: Optional[float] = None
    has_state_refund: Optional[bool] = None
    state_refund_amount: Optional[float] = None
    has_capital_loss_carryover: Optional[bool] = None
    has_business_rental: Optional[bool] = None
    business_income: Optional[float] = None
    rental_income: Optional[float] = None


class DependentData(BaseModel):
    """Mirrors frontend Dependent interface (page 3)."""
    model_config = {"extra": "ignore"}
    id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    ssn: Optional[str] = None
    date_of_birth: Optional[str] = None
    relationship: Optional[str] = None
    months_lived: Optional[int] = None


class MiscInfoData(BaseModel):
    """Mirrors frontend MiscInfo interface (pages 23–24)."""
    model_config = {"extra": "ignore"}
    has_estimated_payments: Optional[bool] = None
    estimated_q1: Optional[float] = None
    estimated_q2: Optional[float] = None
    estimated_q3: Optional[float] = None
    estimated_q4: Optional[float] = None
    extension_payment: Optional[float] = None
    apply_refund_next_year: Optional[bool] = None
    next_year_amount: Optional[float] = None
    has_foreign_accounts: Optional[bool] = None
    has_foreign_assets: Optional[bool] = None
    refund_maximizer: Optional[str] = None
    has_dependents: Optional[str] = None


class StateInfoData(BaseModel):
    """Mirrors frontend StateInfo interface (pages 27–29)."""
    model_config = {"extra": "ignore"}
    is_state_resident: Optional[str] = None
    is_full_year_resident: Optional[str] = None
    has_other_state_income: Optional[str] = None


# ── User Data ──────────────────────────────────────────────────────────────
class UserDataResponse(BaseModel):
    user_id: int
    email: str
    tax_return: Optional[TaxReturnData] = None
    w2_forms: list[W2FormData] = []
    form_1099s: list[Form1099Data] = []
    deductions: Optional[DeductionsData] = None
    credits: Optional[CreditsData] = None
    other_income: Optional[OtherIncomeData] = None
    dependents: list[DependentData] = []
    misc_info: Optional[MiscInfoData] = None
    state_info: Optional[StateInfoData] = None


# ── Update Data ────────────────────────────────────────────────────────────
class UpdateDataRequest(BaseModel):
    tax_return: Optional[TaxReturnData] = None
    w2_forms: Optional[list[W2FormData]] = None
    form_1099s: Optional[list[Form1099Data]] = None
    deductions: Optional[DeductionsData] = None
    credits: Optional[CreditsData] = None
    other_income: Optional[OtherIncomeData] = None
    dependents: Optional[list[DependentData]] = None
    misc_info: Optional[MiscInfoData] = None
    state_info: Optional[StateInfoData] = None


# ── Gusto W-2 Fetch ──────────────────────────────────────────────
class FetchGustoW2Request(BaseModel):
    user_id: int


class FetchGustoW2Response(BaseModel):
    form_type: str
    extracted_fields: dict[str, Any]
    saved: bool
    w2_id: int


# ── Fidelity 1099 Fetch ──────────────────────────────────────────────
class FetchFidelity1099Request(BaseModel):
    user_id: int


class FetchFidelity1099Response(BaseModel):
    form_type: str
    extracted_fields: dict[str, Any]
    saved: bool
    form_1099_id: int
