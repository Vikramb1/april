import json
import logging
import re as _re
from openai import OpenAI
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.config import settings
from app.database.models import (
    ChatMessage, ChatSession, TaxReturn, W2Form, Form1099, Deduction, Credit
)
from app.services.field_loader import get_field_manifest_text, get_pdf_upload_sections

MODEL = "gpt-5.2"        # conversational reply (Phase 2)
PARSE_MODEL = "gpt-4o"  # structured extraction/interpretation (Phase 1 + 1.5)

# ── Snapshot helpers (DB → dict matching frontend TypeScript interfaces) ─────

_SNAP_EXCLUDE = {
    'extra_data', 'raw_json', 'pdf_data', 'other_json',
    'created_at', 'updated_at', 'user_id',
    'other_income', 'dependents', 'misc_info', 'state_info',
}
_SNAP_TR_RENAMES = {
    'dob': 'date_of_birth',
    'direct_deposit_routing': 'bank_routing_number',
    'direct_deposit_account': 'bank_account_number',
}
_SNAP_W2_RENAMES = {
    'federal_withheld': 'federal_tax_withheld',
    'ss_withheld': 'social_security_tax_withheld',
    'medicare_withheld': 'medicare_tax_withheld',
    'state_withheld': 'state_tax_withheld',
    'local_withheld': 'local_tax',
    'box12_code': 'box12_code1',
    'box12_amount': 'box12_amount1',
}

# ── Field schema: types, options, and required fields per section ─────────────

_US_STATES = ["AL","AK","AZ","AR","AA","AE","AP","CA","CO","CT","DE","DC","FL","GA","GU","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VI","VA","WA","WV","WI","WY"]

FIELD_SCHEMA: dict[str, dict] = {
    "personal-info": {
        "required": ["first_name","last_name","ssn","date_of_birth","address","city","state","zip_code",
                     "claimed_as_dependent","presidential_fund","blind","deceased","nonresident_alien"],
        "conditional_required": {},
        "fields": {
            "first_name":           {"type": "text"},
            "middle_initial":       {"type": "text"},
            "last_name":            {"type": "text"},
            "suffix":               {"type": "select", "options": ["JR","SR","II","III","IV","V","VI"]},
            "ssn":                  {"type": "text"},
            "date_of_birth":        {"type": "date"},
            "occupation":           {"type": "text"},
            "address":              {"type": "text"},
            "apt":                  {"type": "text"},
            "city":                 {"type": "text"},
            "state":                {"type": "select", "options": _US_STATES},
            "zip_code":             {"type": "text"},
            "addr_changed":         {"type": "boolean"},
            "claimed_as_dependent": {"type": "radio",  "options": ["Yes","No"]},
            "presidential_fund":    {"type": "radio",  "options": ["Yes","No"]},
            "blind":                {"type": "radio",  "options": ["Yes","No"]},
            "deceased":             {"type": "radio",  "options": ["Yes","No"]},
            "nonresident_alien":    {"type": "radio",  "options": ["Yes","No"]},
        },
    },
    "filing-status": {
        "required": ["filing_status"],
        "conditional_required": {
            "filing_status": {"Married Filing Jointly": ["spouse_first_name","spouse_last_name","spouse_ssn","spouse_dob"]}
        },
        "fields": {
            "filing_status":     {"type": "radio", "options": ["Single","Married Filing Jointly","Married Filing Separately","Head of Household","Qualifying Surviving Spouse"]},
            "spouse_first_name": {"type": "text"},
            "spouse_last_name":  {"type": "text"},
            "spouse_ssn":        {"type": "text"},
            "spouse_dob":        {"type": "date"},
        },
    },
    "dependents": {
        "required": [],
        "conditional_required": {},
        "fields": {
            "first_name":    {"type": "text"},
            "last_name":     {"type": "text"},
            "ssn":           {"type": "text"},
            "date_of_birth": {"type": "date"},
            "relationship":  {"type": "select", "options": ["Son","Daughter","Stepchild","Foster Child","Sibling","Grandchild","Niece-Nephew","Parent","Other"]},
            "months_lived":  {"type": "number"},
        },
    },
    "identity-protection": {
        "required": ["identity_protection_pin"],
        "conditional_required": {"identity_protection_pin": {"Yes": ["identity_protection_pin_number"]}},
        "fields": {
            "identity_protection_pin":        {"type": "radio", "options": ["Yes","No"]},
            "identity_protection_pin_number": {"type": "text"},
        },
    },
    "w2-income": {
        "required": ["employer_name","wages"],
        "conditional_required": {},
        "fields": {
            "employer_name":         {"type": "text"},
            "wages":                 {"type": "number"},
            "federal_withheld":      {"type": "number"},
            "social_security_wages": {"type": "number"},
            "ss_withheld":           {"type": "number"},
            "medicare_wages":        {"type": "number"},
            "medicare_withheld":     {"type": "number"},
            "employer_state":        {"type": "select", "options": _US_STATES},
            "state_wages":           {"type": "number"},
            "state_withheld":        {"type": "number"},
            "statutory_employee":    {"type": "boolean"},
            "retirement_plan":       {"type": "boolean"},
            "third_party_sick_pay":  {"type": "boolean"},
        },
    },
    "1099-income": {
        "required": ["payer_name"],
        "conditional_required": {},
        "fields": {
            "form_type":            {"type": "select", "options": ["NEC","INT","DIV","B","MISC","R","SSA"]},
            "payer_name":           {"type": "text"},
            "amount":               {"type": "number"},
            "federal_tax_withheld": {"type": "number"},
        },
    },
    "other-income": {
        "required": ["has_cryptocurrency"],
        "conditional_required": {},
        "fields": {
            "has_cryptocurrency":         {"type": "radio",   "options": ["Yes","No"]},
            "has_investments":            {"type": "boolean"},
            "investment_income":          {"type": "number"},
            "has_unemployment":           {"type": "boolean"},
            "unemployment_amount":        {"type": "number"},
            "has_social_security":        {"type": "boolean"},
            "social_security_amount":     {"type": "number"},
            "has_retirement_income":      {"type": "boolean"},
            "retirement_income":          {"type": "number"},
            "has_state_refund":           {"type": "boolean"},
            "state_refund_amount":        {"type": "number"},
            "has_capital_loss_carryover": {"type": "boolean"},
            "has_business_rental":        {"type": "boolean"},
            "business_income":            {"type": "number"},
        },
    },
    "deductions": {
        "required": ["type"],
        "conditional_required": {},
        "fields": {
            "type":                    {"type": "select", "options": ["standard","itemized"]},
            "has_homeowner":           {"type": "boolean"},
            "mortgage_interest":       {"type": "number"},
            "property_taxes":          {"type": "number"},
            "has_donations":           {"type": "boolean"},
            "cash_donations":          {"type": "number"},
            "noncash_donations":       {"type": "number"},
            "has_medical":             {"type": "boolean"},
            "medical_expenses":        {"type": "number"},
            "has_taxes_paid":          {"type": "boolean"},
            "state_local_income_tax":  {"type": "number"},
            "state_local_sales_tax":   {"type": "number"},
            "has_investment_interest": {"type": "boolean"},
            "investment_interest":     {"type": "number"},
            "has_casualty":            {"type": "boolean"},
            "casualty_loss":           {"type": "number"},
            "has_other_itemized":      {"type": "boolean"},
            "other_itemized":          {"type": "number"},
        },
    },
    "health-insurance": {
        "required": ["has_marketplace_insurance"],
        "conditional_required": {},
        "fields": {
            "has_marketplace_insurance": {"type": "radio", "options": ["Yes","No"]},
        },
    },
    "common-credits": {
        "required": [],
        "conditional_required": {},
        "fields": {
            "has_ira":                        {"type": "boolean"},
            "ira_amount":                     {"type": "number"},
            "ira_type":                       {"type": "select", "options": ["Traditional","Roth"]},
            "has_college_tuition":            {"type": "boolean"},
            "college_tuition_amount":         {"type": "number"},
            "has_student_loan":               {"type": "boolean"},
            "student_loan_interest":          {"type": "number"},
            "has_teacher_expenses":           {"type": "boolean"},
            "teacher_expenses":               {"type": "number"},
            "has_eic":                        {"type": "boolean"},
            "eic_qualifying_children":        {"type": "number"},
            "has_car_loan":                   {"type": "boolean"},
            "car_loan_interest":              {"type": "number"},
            "has_home_energy":                {"type": "boolean"},
            "home_energy_amount":             {"type": "number"},
            "has_child_care":                 {"type": "boolean"},
            "child_care_expenses":            {"type": "number"},
            "child_care_qualifying_children": {"type": "number"},
        },
    },
    "other-credits": {
        "required": [],
        "conditional_required": {},
        "fields": {
            "has_hsa":                {"type": "boolean"},
            "hsa_amount":             {"type": "number"},
            "has_msa":                {"type": "boolean"},
            "has_adoption":           {"type": "boolean"},
            "adoption_expenses":      {"type": "number"},
            "has_elderly":            {"type": "boolean"},
            "has_clean_vehicle":      {"type": "boolean"},
            "clean_vehicle_amount":   {"type": "number"},
            "has_alternative_fuel":   {"type": "boolean"},
            "has_mcc":                {"type": "boolean"},
            "has_employee_business":  {"type": "boolean"},
            "has_military_moving":    {"type": "boolean"},
            "has_claim_of_right":     {"type": "boolean"},
            "has_prior_year_min_tax": {"type": "boolean"},
            "has_misc_adjustments":   {"type": "boolean"},
        },
    },
    "misc-forms": {
        "required": [],
        "conditional_required": {},
        "fields": {
            "has_estimated_payments": {"type": "boolean"},
            "estimated_q1":           {"type": "number"},
            "estimated_q2":           {"type": "number"},
            "estimated_q3":           {"type": "number"},
            "estimated_q4":           {"type": "number"},
            "extension_payment":      {"type": "number"},
            "apply_refund_next_year": {"type": "boolean"},
            "next_year_amount":       {"type": "number"},
            "has_foreign_accounts":   {"type": "radio", "options": ["Yes","No"]},
            "has_foreign_assets":     {"type": "radio", "options": ["Yes","No"]},
        },
    },
    "refund-maximizer": {
        "required": ["refund_maximizer"],
        "conditional_required": {},
        "fields": {
            "refund_maximizer": {"type": "radio", "options": ["maximize","skip"]},
        },
    },
    "state-residency": {
        "required": ["is_state_resident"],
        "conditional_required": {},
        "fields": {
            "is_state_resident":      {"type": "radio", "options": ["Yes","No"]},
            "is_full_year_resident":  {"type": "radio", "options": ["Yes","No"]},
            "has_other_state_income": {"type": "radio", "options": ["Yes","No"]},
        },
    },
    "state-return":    {"required": [], "conditional_required": {}, "fields": {}},
    "federal-summary": {"required": [], "conditional_required": {}, "fields": {}},
    "bank-refund": {
        "required": ["refund_type"],
        "conditional_required": {
            "refund_type": {"direct_deposit": ["routing","account","bank_account_type"]}
        },
        "fields": {
            "refund_type":         {"type": "radio",  "options": ["direct_deposit","go2bank","paper_check"]},
            "routing":             {"type": "text"},
            "account":             {"type": "text"},
            "bank_account_type":   {"type": "radio",  "options": ["Checking","Savings"]},
            "bank_is_foreign":     {"type": "boolean"},
            "is_multiple_deposit": {"type": "radio",  "options": ["Yes","No"]},
        },
    },
    "review": {
        "required": [],
        "conditional_required": {},
        "fields": {"phone_option": {"type": "text"}},
    },
}


def _normalize_value(value, field_meta: dict):
    """Normalize raw LLM output to the correct Python type per field_meta."""
    if value is None:
        return None
    ftype = field_meta.get("type", "text")
    options = field_meta.get("options", [])

    if ftype == "radio":
        raw = str(value).strip().lower().rstrip(".")
        yn_field = set(options) <= {"Yes", "No"}
        if yn_field:
            if isinstance(value, bool):
                return "Yes" if value else "No"
            if raw in {"yes", "true", "1", "y", "yep", "yeah", "correct", "affirmative"}:
                return "Yes"
            if raw in {"no", "false", "0", "n", "nope", "nah", "incorrect", "negative"}:
                return "No"
            return None

        def _cmp(s: str) -> str:
            """Normalize for comparison: lowercase, collapse whitespace/underscores/hyphens."""
            return _re.sub(r"[\s_\-]+", " ", s.lower()).strip()

        raw_cmp = _cmp(raw)
        # 1. Exact match (normalized)
        for opt in options:
            if raw_cmp == _cmp(opt):
                return opt
        # 2. Prefix match (normalized)
        for opt in options:
            opt_cmp = _cmp(opt)
            if opt_cmp.startswith(raw_cmp) or raw_cmp.startswith(opt_cmp):
                return opt
        # 3. Token subset: every token in raw is present in option
        raw_tokens = set(raw_cmp.split())
        for opt in options:
            opt_tokens = set(_cmp(opt).split())
            if raw_tokens and raw_tokens <= opt_tokens:
                return opt
        # 4. Common abbreviation aliases for filing status and other fields
        _radio_shortcuts = {
            "single": "Single",
            "jointly": "Married Filing Jointly", "mfj": "Married Filing Jointly",
            "separately": "Married Filing Separately", "mfs": "Married Filing Separately",
            "hoh": "Head of Household", "head of household": "Head of Household",
            "qss": "Qualifying Surviving Spouse", "surviving spouse": "Qualifying Surviving Spouse",
            "direct deposit": "direct_deposit", "deposit": "direct_deposit",
            "paper check": "paper_check", "check": "paper_check",
            "checking": "Checking", "savings": "Savings",
            "maximize": "maximize", "skip": "skip",
        }
        if raw_cmp in _radio_shortcuts:
            target = _radio_shortcuts[raw_cmp]
            if target in options:
                return target
        return None

    elif ftype == "select":
        raw = str(value).strip()

        def _cmp_s(s: str) -> str:
            return _re.sub(r"[\s_\-]+", " ", s.lower()).strip()

        clean = [o for o in options if o != "(blank)"]
        raw_cmp = _cmp_s(raw)
        # 1. Exact match (normalized)
        for opt in clean:
            if raw_cmp == _cmp_s(opt):
                return opt
        # 2. Prefix match (normalized)
        for opt in clean:
            opt_cmp = _cmp_s(opt)
            if opt_cmp.startswith(raw_cmp) or raw_cmp.startswith(opt_cmp):
                return opt
        # 3. Token subset
        raw_tokens = set(raw_cmp.split())
        for opt in clean:
            opt_tokens = set(_cmp_s(opt).split())
            if raw_tokens and raw_tokens <= opt_tokens:
                return opt
        return None

    elif ftype == "boolean":
        if isinstance(value, bool):
            return value
        if isinstance(value, (int, float)):
            return bool(value)
        raw = str(value).strip().lower().rstrip(".")
        if raw in {"yes", "true", "1", "y", "checked", "on"}:
            return True
        if raw in {"no", "false", "0", "n", "unchecked", "off"}:
            return False
        return None

    elif ftype == "number":
        if isinstance(value, (int, float)):
            return float(value)
        raw = _re.sub(r"[\$,\s]", "", str(value)).rstrip("%")
        try:
            return float(raw)
        except ValueError:
            return None

    elif ftype == "date":
        import datetime as _dt
        raw = str(value).strip()

        def _try_parse(s: str):
            """Return datetime.date if s is a valid YYYY-MM-DD, else None."""
            try:
                return _dt.date.fromisoformat(s)
            except (ValueError, TypeError):
                return None

        # YYYY-MM-DD (already correct format)
        if _re.match(r"^\d{4}-\d{2}-\d{2}$", raw):
            if _try_parse(raw):
                return raw
            return None  # format correct but date invalid (e.g. Feb 30)

        # MM/DD/YYYY or MM-DD-YYYY
        m = _re.match(r"^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$", raw)
        if m:
            candidate = f"{m.group(3)}-{m.group(1).zfill(2)}-{m.group(2).zfill(2)}"
            if _try_parse(candidate):
                return candidate
            return None  # invalid day/month combo

        # MMDDYYYY — 8 digits no separators (e.g. "11172004" → "2004-11-17")
        m2 = _re.match(r"^(\d{2})(\d{2})(\d{4})$", raw)
        if m2:
            candidate = f"{m2.group(3)}-{m2.group(1)}-{m2.group(2)}"
            if _try_parse(candidate):
                return candidate
            return None

        # Unrecognized format — return None so the field stays "missing" and the agent
        # re-asks with explicit format guidance. Phase 1.5 (gpt-4o) handles reformatting
        # of unusual date strings (e.g. "January 15 1990") on the next turn.
        return None

    else:  # text
        result = str(value).strip()
        return result if result else None


# Per-field validation rules used in both extraction and interpretation prompts
_FIELD_VALIDATION: dict[str, str] = {
    "ssn":                          "Exactly 9 digits after stripping dashes/spaces. Reject if digit count ≠ 9.",
    "spouse_ssn":                   "Exactly 9 digits after stripping dashes/spaces. Reject if digit count ≠ 9.",
    "date_of_birth":                "Real calendar date; person must be 0–120 years old as of 2025.",
    "spouse_dob":                   "Real calendar date; spouse must be 0–120 years old as of 2025.",
    "zip_code":                     "Exactly 5 digits.",
    "routing":                      "Bank routing number — exactly 9 digits.",
    "account":                      "Bank account number — digits only, 4–17 characters.",
    "phone_option":                  "US phone number — 10 digits (strip spaces/dashes when counting).",
    "identity_protection_pin_number": "IRS IP PIN — exactly 6 digits.",
    "wages":                        "Non-negative dollar amount (Box 1 on W-2).",
    "federal_withheld":             "Non-negative dollar amount, typically less than wages.",
    "social_security_wages":        "Non-negative dollar amount.",
    "ss_withheld":                  "Non-negative dollar amount.",
    "medicare_wages":               "Non-negative dollar amount.",
    "medicare_withheld":            "Non-negative dollar amount.",
    "state_wages":                  "Non-negative dollar amount.",
    "state_withheld":               "Non-negative dollar amount.",
    "estimated_q1":                 "Non-negative dollar amount.",
    "estimated_q2":                 "Non-negative dollar amount.",
    "estimated_q3":                 "Non-negative dollar amount.",
    "estimated_q4":                 "Non-negative dollar amount.",
    "employer_state":               "Valid 2-letter US state abbreviation (e.g. CA, TX, NY).",
    "state":                        "Valid 2-letter US state abbreviation (e.g. CA, TX, NY).",
    "eic_qualifying_children":      "Integer 0–3.",
    "child_care_qualifying_children": "Positive integer.",
    "months_lived":                 "Integer 1–12.",
}


def _get_field_validation_hint(field_name: str, field_meta: dict) -> str:
    """Return a concise validation rule string for a specific field."""
    if field_name in _FIELD_VALIDATION:
        return _FIELD_VALIDATION[field_name]
    ftype = field_meta.get("type", "text")
    if ftype == "number":
        return "Non-negative number only."
    if ftype == "date":
        return "Must be a real calendar date in YYYY-MM-DD format."
    if ftype in ("radio", "select"):
        opts = field_meta.get("options", [])
        return f"Must be exactly one of: {opts}"
    if ftype == "boolean":
        return "Output true or false only."
    return ""


def _get_section_field_hints(section: str) -> str:
    schema = FIELD_SCHEMA.get(section)
    if not schema:
        return "(no schema for this section)"
    lines = []
    req = schema.get("required", [])
    if req:
        lines.append(f"REQUIRED: {', '.join(req)}")
    for field_name, meta in schema["fields"].items():
        ftype = meta["type"]
        opts = meta.get("options", [])
        validation = _FIELD_VALIDATION.get(field_name, "")
        if ftype in ("radio", "select") and opts:
            if len(opts) > 10:
                lines.append(f"  {field_name} ({ftype}): 2-letter code e.g. 'CA', 'TX'")
            else:
                lines.append(f"  {field_name} ({ftype}): {opts}")
        elif ftype == "boolean":
            lines.append(f"  {field_name} (boolean): true or false  [NOT 'Yes'/'No']")
        elif ftype == "number":
            lines.append(f"  {field_name} (number): numeric only, no $ or commas")
        elif ftype == "date":
            lines.append(f"  {field_name} (date): YYYY-MM-DD")
        else:
            suffix = f"  [{validation}]" if validation else ""
            lines.append(f"  {field_name} (text){suffix}")
    return "\n".join(lines)


def _get_missing_required_fields(db: Session, user_id: int, section: str) -> list[str]:
    schema = FIELD_SCHEMA.get(section, {})
    required = schema.get("required", [])
    conditional = schema.get("conditional_required", {})
    missing = []

    def _present(v) -> bool:
        if v is None:
            return False
        if isinstance(v, str):
            return v.strip() != ""
        return True

    tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
    ed = (tr.extra_data or {}) if tr else {}

    if section == "personal-info":
        lookup = {
            "first_name":           tr.first_name if tr else None,
            "last_name":            tr.last_name  if tr else None,
            "ssn":                  tr.ssn        if tr else None,
            "date_of_birth":        tr.dob        if tr else None,
            "address":              tr.address    if tr else None,
            "city":                 ed.get("city"),
            "state":                ed.get("state"),
            "zip_code":             ed.get("zip_code"),
            "claimed_as_dependent": ed.get("claimed_as_dependent"),
            "presidential_fund":    ed.get("presidential_fund"),
            "blind":                ed.get("blind"),
            "deceased":             ed.get("deceased"),
            "nonresident_alien":    ed.get("nonresident_alien"),
        }
        for f in required:
            if not _present(lookup.get(f)):
                missing.append(f)

    elif section == "filing-status":
        fs = tr.filing_status if tr else None
        if not _present(fs):
            missing.append("filing_status")
        elif fs == "Married Filing Jointly":
            for sf in conditional.get("filing_status", {}).get("Married Filing Jointly", []):
                if not _present(ed.get(sf)):
                    missing.append(sf)

    elif section == "dependents":
        deps = (tr.dependents or []) if tr else []
        for i, dep in enumerate(deps):
            for f in ["first_name", "last_name", "date_of_birth", "relationship"]:
                if not _present(dep.get(f)):
                    missing.append(f"dependent[{i+1}].{f}")

    elif section == "identity-protection":
        pin_val = ed.get("identity_protection_pin")
        if not _present(pin_val):
            missing.append("identity_protection_pin")
        elif pin_val == "Yes":
            for f in conditional.get("identity_protection_pin", {}).get("Yes", []):
                if not _present(ed.get(f)):
                    missing.append(f)

    elif section == "w2-income":
        w2s = db.query(W2Form).filter_by(user_id=user_id).all()
        if not w2s:
            missing.append("employer_name (no W-2 added yet)")
        else:
            for i, w2 in enumerate(w2s):
                if not _present(w2.employer_name):
                    missing.append(f"w2[{i+1}].employer_name")
                if not _present(w2.wages):
                    missing.append(f"w2[{i+1}].wages")

    elif section == "1099-income":
        f1099s = db.query(Form1099).filter_by(user_id=user_id).all()
        if not f1099s:
            missing.append("payer_name (no 1099 added yet)")
        else:
            for i, f in enumerate(f1099s):
                if not _present(f.payer_name):
                    missing.append(f"1099[{i+1}].payer_name")

    elif section == "other-income":
        oi = (tr.other_income or {}) if tr else {}
        for f in required:
            if not _present(oi.get(f)):
                missing.append(f)

    elif section == "deductions":
        ded = db.query(Deduction).filter_by(user_id=user_id).first()
        if not ded or not _present(ded.type):
            missing.append("type (standard or itemized)")

    elif section == "health-insurance":
        cred = db.query(Credit).filter_by(user_id=user_id).first()
        other_json = (cred.other_json or {}) if cred else {}
        if not _present(other_json.get("has_marketplace_insurance")):
            missing.append("has_marketplace_insurance")

    elif section == "refund-maximizer":
        mi = (tr.misc_info or {}) if tr else {}
        if not _present(mi.get("refund_maximizer")):
            missing.append("refund_maximizer (maximize or skip)")

    elif section == "state-residency":
        si = (tr.state_info or {}) if tr else {}
        if not _present(si.get("is_state_resident")):
            missing.append("is_state_resident")

    elif section == "bank-refund":
        refund_type = ed.get("refund_type")
        if not _present(refund_type):
            missing.append("refund_type (direct_deposit, go2bank, or paper_check)")
        elif refund_type == "direct_deposit":
            if not _present(tr.direct_deposit_routing if tr else None):
                missing.append("routing")
            if not _present(tr.direct_deposit_account if tr else None):
                missing.append("account")
            if not _present(ed.get("bank_account_type")):
                missing.append("bank_account_type")

    return missing


def _snap_row(obj, renames: dict | None = None) -> dict | None:
    if obj is None:
        return None
    base = {}
    for col in obj.__table__.columns:
        if col.name in _SNAP_EXCLUDE:
            continue
        key = (renames or {}).get(col.name, col.name)
        base[key] = getattr(obj, col.name)
    overflow = getattr(obj, 'extra_data', None) or getattr(obj, 'raw_json', None) or {}
    if not isinstance(overflow, dict):
        overflow = {}
    return {**base, **overflow}


def _snap_ded(ded) -> dict | None:
    if ded is None:
        return None
    base = {
        'cash_donations': ded.charitable_cash,
        'mortgage_interest': ded.mortgage_interest,
        'student_loan_interest': ded.student_loan_interest,
    }
    other = ded.other_json or {}
    result = {k: v for k, v in base.items() if v is not None}
    result.update(other)
    return result


def _snap_cred(cred) -> dict | None:
    if cred is None:
        return None
    base = {'eic_qualifying_children': cred.eitc_qualifying_children}
    other = cred.other_json or {}
    result = {k: v for k, v in base.items() if v is not None}
    result.update(other)
    return result


def _build_snapshot(db: Session, user_id: int) -> dict:
    """Return the full current user data as a dict for direct frontend hydration."""
    tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
    w2s = db.query(W2Form).filter_by(user_id=user_id).all()
    f1099s = db.query(Form1099).filter_by(user_id=user_id).all()
    ded = db.query(Deduction).filter_by(user_id=user_id).first()
    cred = db.query(Credit).filter_by(user_id=user_id).first()
    return {
        'tax_return': _snap_row(tr, _SNAP_TR_RENAMES),
        'w2_forms': [_snap_row(w, _SNAP_W2_RENAMES) for w in w2s],
        'form_1099s': [_snap_row(f) for f in f1099s],
        'deductions': _snap_ded(ded),
        'credits': _snap_cred(cred),
        'other_income': tr.other_income if tr else None,
        'dependents': list(tr.dependents or []) if tr else [],
        'misc_info': tr.misc_info if tr else None,
        'state_info': tr.state_info if tr else None,
    }


# Only actual DB columns on TaxReturn (everything else → extra_data)
_TR_COLUMN_MAP = {
    "first_name", "last_name", "ssn", "dob", "date_of_birth",
    "address", "occupation", "filing_status",
    "direct_deposit_routing", "direct_deposit_account",
}


def _build_existing_data_summary(db: Session, user_id: int) -> str:
    lines = []
    tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
    if tr:
        if tr.first_name:
            lines.append(f"- Name: {tr.first_name} {tr.last_name or ''}")
        if tr.ssn:
            lines.append("- SSN: collected")
        if tr.dob:
            lines.append(f"- DOB: {tr.dob}")
        if tr.address:
            ed = tr.extra_data or {}
            city = ed.get('city', '')
            state = ed.get('state', '')
            lines.append(f"- Address: {tr.address}, {city} {state}")
        if tr.occupation:
            lines.append(f"- Occupation: {tr.occupation}")
        if tr.filing_status:
            lines.append(f"- Filing status: {tr.filing_status}")
        ed = tr.extra_data or {}
        if ed.get("identity_protection_pin"):
            lines.append("- Identity Protection PIN: collected")
        if ed.get("spouse_first_name"):
            lines.append("- Spouse info: collected")
        if tr.other_income:
            lines.append("- Other income: collected")
        if tr.dependents:
            lines.append(f"- Dependents: {len(tr.dependents)} collected")
        if tr.misc_info:
            lines.append("- Misc info: collected")
        if tr.state_info:
            lines.append("- State info: collected")
        if tr.direct_deposit_routing:
            lines.append("- Bank info: collected")
    w2s = db.query(W2Form).filter_by(user_id=user_id).all()
    for w in w2s:
        lines.append(f"- W-2: {w.employer_name or 'employer'}, wages ${w.wages or '?'}")
    f1099s = db.query(Form1099).filter_by(user_id=user_id).all()
    for f in f1099s:
        lines.append(f"- 1099-{f.form_type}: {f.payer_name or 'payer'}, amount ${f.amount or '?'}")
    ded = db.query(Deduction).filter_by(user_id=user_id).first()
    if ded:
        lines.append(f"- Deductions: {ded.type or 'type unknown'}")
    cred = db.query(Credit).filter_by(user_id=user_id).first()
    if cred:
        lines.append("- Credits: collected")
    return "\n".join(lines) if lines else "No data collected yet — fresh return."


SYSTEM_PROMPT_TEMPLATE = """You are April, a warm and expert CPA helping a client file their 2025 US federal tax return. 20+ years of experience. Speak plainly — no jargon.

## YOUR JOB
Handle the CONVERSATION only. Tax data is saved automatically — you do NOT have a save_fields tool.
Your only tools: navigate_to_section (update the sidebar), request_pdf_upload (ask user to upload PDF).

## QUESTION STYLE
- Ask ONE focused question per turn (or a short grouped cluster for closely related items)
- Accept multi-field answers naturally — do NOT re-ask for anything the user already told you
- Be warm, efficient. Vary your affirmations — don't always say "Great!"
- LENIENCY: Always accept whatever the user gives you. If the format is unusual, accept it. If a field is optional and they say "skip" / "N/A" / "I don't know" / "no" → acknowledge, record what you can, move to the next question. Never get stuck demanding a perfect answer.

## PDF UPLOADS
Sections accepting PDF uploads: {pdf_upload_sections}
When collecting W-2 or 1099 data, offer: "You can type the numbers or upload the PDF and I'll read it for you."

## FIRST MESSAGE
If the user's message is "start" or the very first message, greet them warmly:

"Hi there! I'm April, your personal tax filing assistant. I'll walk you through your 2025 federal tax return — usually takes about 5 minutes.

What's your full legal name?"

Then call navigate_to_section("personal-info").

## ALREADY COLLECTED (skip — do not re-ask)
{existing_data_summary}

## SECTION QUESTION CHECKLISTS
Work through EVERY item in the current section's checklist before calling navigate_to_section().
[R] = Required — must be in the database before you can advance.
[O] = Optional — ask it, accept ANY answer (even "no"/"skip"), record what you can, then move on.
Do NOT skip [O] questions — always ask them. Do NOT advance until ALL items are checked off.

### personal-info
  [R] Full legal name (first + last; offer middle initial / suffix)
  [R] SSN (9 digits — accept any format, e.g. dashes are fine)
  [R] Date of birth
  [R] Home address — street, city, state, zip
  [O] Occupation / job title
  [O] Did your address change from last year?
  [O] Can anyone else claim you as a dependent on their return?
  [O] Presidential Election Campaign Fund — "Would you like to designate $3 to the presidential campaign fund?"
  [O] Are you legally blind?
  [O] Did the taxpayer or spouse pass away in 2025?
  [O] Are you or your spouse a nonresident alien?

### filing-status
  [R] Filing status — Single / Married Filing Jointly / Married Filing Separately / Head of Household / Qualifying Surviving Spouse
  [R if MFJ] Spouse: first name, last name, SSN, date of birth

### dependents  (skip entire section if user says no dependents)
  [R] For each dependent: first name, last name, SSN, date of birth, relationship, months lived with you
  After each: "Any other dependents?"

### identity-protection  (skip entire section if user says no IP PIN)
  [R] Do you have an IRS Identity Protection PIN?
  [R if Yes] What is the 6-digit IP PIN?

### w2-income  (repeat for each W-2)
  [R] Employer name
  [R] Box 1 — Wages
  [O] Box 2 — Federal income tax withheld
  [O] Box 3 — Social Security wages / Box 4 — SS tax withheld
  [O] Box 5 — Medicare wages / Box 6 — Medicare tax withheld
  [O] Box 15-17 — Employer state, state wages, state tax withheld
  [O] Boxes 13 — Statutory employee? Retirement plan? Third-party sick pay?
  After each W-2: "Do you have another W-2?"

### 1099-income  (repeat for each 1099)
  [R] Payer name
  [O] Form type (NEC / INT / DIV / B / MISC / R / SSA)
  [O] Amount
  [O] Federal income tax withheld
  After each: "Do you have another 1099?"

### other-income  (ask each; "no" is a valid answer and moves you forward)
  [R] Did you buy, sell, or trade any cryptocurrency in 2025?
  [O] Investment income (stocks, bonds, dividends, capital gains)?
  [O] Unemployment compensation?
  [O] Social Security benefits?
  [O] Retirement income (pension, IRA withdrawal, 401k distribution)?
  [O] Did you receive a state or local tax refund last year?
  [O] Capital loss carryover from a prior year?
  [O] Business or rental income?

### deductions
  [R] Standard deduction or itemized? (Tip: itemized is worth it if they have a mortgage, large donations, or big medical bills)
  If itemized, ask:
  [O] Mortgage interest paid?
  [O] Property taxes?
  [O] Cash charitable donations? Noncash donations?
  [O] Medical expenses?
  [O] State/local income or sales taxes paid?
  [O] Investment interest expense?
  [O] Casualty or theft losses?
  [O] Any other itemized deductions?

### health-insurance
  [R] Did you have Marketplace (ACA/Obamacare) health insurance in 2025?

### common-credits  (ask each; "no" is fine)
  [O] Did you contribute to an IRA in 2025? (Traditional or Roth — how much?)
  [O] Any college tuition or education expenses?
  [O] Student loan interest paid?
  [O] Teacher classroom expenses (educators only)?
  [O] Earned Income Credit — any qualifying children?
  [O] Car loan interest for an electric or clean vehicle?
  [O] Home energy improvements (solar, insulation, heat pump, etc.)?
  [O] Child or dependent care expenses (daycare, after-school)?

### other-credits  (ask each; "no" is fine)
  [O] HSA (Health Savings Account) contributions?
  [O] MSA (Medical Savings Account)?
  [O] Adoption expenses?
  [O] Elderly or permanently disabled credit?
  [O] New clean vehicle credit (EV purchase)?
  [O] Alternative fuel vehicle refueling credit?
  [O] Mortgage credit certificate?
  [O] Unreimbursed employee business expenses?
  [O] Military moving expenses?
  [O] Claim of right repayment?
  [O] Prior year alternative minimum tax credit?
  [O] Other miscellaneous tax adjustments?

### misc-forms  (ask each; "no" is fine)
  [O] Made estimated federal tax payments in 2025? (If yes: Q1–Q4 amounts)
  [O] Did you make an extension payment?
  [O] Apply any refund toward next year's taxes?
  [O] Do you have foreign bank accounts?
  [O] Foreign financial assets above the reporting threshold?

### refund-maximizer
  [R] "Would you like me to maximize your refund, or skip the optimizer?" (maximize / skip)

### state-residency
  [R] Are you a resident of [state from address]?
  [O] Were you a full-year resident, or did you move mid-year?
  [O] Did you earn income in another state?

### state-return
  No checklist — navigate when ready.

### federal-summary
  No checklist — navigate when ready.

### bank-refund
  [R] How would you like to receive your refund — direct deposit, Go2Bank prepaid card, or paper check?
  [R if direct deposit] Routing number, account number, account type (checking or savings)
  [O] Is this a foreign bank account?
  [O] Split the refund across multiple accounts?

### review
  [O] Best phone number to reach you?

## ADVANCE RULE
Call navigate_to_section() ONLY when:
  1. The database says "All required fields for this section are collected." (see status below), AND
  2. You have gone through every [O] item in the checklist above for the current section.
If user mentions data for a DIFFERENT section → say "Got it, noted." then return to the current checklist.

## CURRENT SECTION STATUS
{missing_fields_text}
"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "save_fields",
            "description": "Save collected tax data to the database for a given section. Call immediately after gathering all required fields for a section. Use the exact section key strings from the system prompt.",
            "parameters": {
                "type": "object",
                "properties": {
                    "section": {"type": "string", "description": "Section key, e.g. 'personal-info', 'w2-income'"},
                    "fields": {"type": "object", "description": "Key-value pairs of field IDs and collected values"},
                },
                "required": ["section", "fields"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "navigate_to_section",
            "description": "Tell the frontend to display a specific section. Call after save_fields so the user sees the section that was just filled. Use the exact 17 section key strings from the system prompt.",
            "parameters": {
                "type": "object",
                "properties": {
                    "section": {"type": "string", "description": "Section key to navigate to"},
                },
                "required": ["section"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "request_pdf_upload",
            "description": "Ask the user to upload a PDF document for W-2 or 1099 data extraction.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {"type": "string", "description": "Human-readable instruction for the upload"},
                },
                "required": ["reason"],
            },
        },
    },
]


# ── Phase 1: Forced extraction (separate from conversational reply) ──────────

EXTRACT_SYSTEM_PROMPT = """You are a tax data extraction engine. Extract ALL field values from the user's message and save them via save_fields. Do NOT output any text.

Current section: {current_section}

## FIELD TYPES AND VALID VALUES
{section_field_hints}

## RULES
1. Extract ALL explicit values: names, numbers, dates, addresses, amounts, yes/no answers.
2. Names: "john smith jr" → {{first_name: "John", last_name: "Smith", suffix: "JR"}}
3. Dates → YYYY-MM-DD when possible (e.g. "11172004" → "2004-11-17", "3/5/1990" → "1990-03-05").
   If you cannot reformat a date, extract the raw value anyway — the backend will normalize it.
   NEVER omit a field just because its format is unusual.
   Numbers → numeric only, no $ or commas.
4. radio Yes/No fields → output "Yes" or "No" (string, not boolean).
5. radio other options → output the EXACT string from the field list above.
6. boolean (checkbox) fields → output true or false (NOT "Yes"/"No").
7. select fields → output EXACT option string from the field list above.
8. Nothing extractable → call save_fields with fields={{}}.
9. Call save_fields EXACTLY ONCE using section="{current_section}".

## VALIDATION — omit any field whose value fails these checks
- ssn / spouse_ssn: strip dashes and spaces → must be exactly 9 digits. Skip if not.
- date_of_birth / spouse_dob: must be a real calendar date; person must be 0–120 years old in 2025.
- zip_code: must be exactly 5 digits.
- routing: must be exactly 9 digits.
- account: digits only, 4–17 characters.
- phone_option: must be a 10-digit US phone number (strip spaces/dashes when counting).
- identity_protection_pin_number: must be exactly 6 digits.
- number fields (wages, amounts, withheld): must be ≥ 0. Reject negative values.
- employer_state / state: must be a valid 2-letter US state abbreviation.
- eic_qualifying_children / child_care_qualifying_children: integer 0–10.
- months_lived: integer 1–12.
- If a value is clearly wrong for its field (e.g. a name given for an SSN), omit it.
- When uncertain whether a value is valid, omit it — the user will be re-asked.

## EXACT FIELD NAMES (no variations):
personal-info: first_name, middle_initial, last_name, suffix, ssn, date_of_birth, occupation, address, apt, city, state, zip_code, addr_changed, claimed_as_dependent, presidential_fund, blind, deceased, nonresident_alien
filing-status: filing_status, spouse_first_name, spouse_last_name, spouse_ssn, spouse_dob
w2-income: employer_name, wages, federal_withheld, social_security_wages, ss_withheld, medicare_wages, medicare_withheld, employer_state, state_wages, state_withheld, statutory_employee, retirement_plan, third_party_sick_pay
1099-income: form_type, payer_name, amount, federal_tax_withheld
other-income: has_cryptocurrency, has_investments, investment_income, has_unemployment, unemployment_amount, has_social_security, social_security_amount, has_retirement_income, retirement_income, has_state_refund, state_refund_amount, has_capital_loss_carryover, has_business_rental, business_income
deductions: type, has_homeowner, mortgage_interest, property_taxes, has_donations, cash_donations, noncash_donations, has_medical, medical_expenses, has_taxes_paid, state_local_income_tax, state_local_sales_tax, has_investment_interest, investment_interest, has_casualty, casualty_loss, has_other_itemized, other_itemized
health-insurance: has_marketplace_insurance
common-credits: has_ira, ira_amount, ira_type, has_college_tuition, college_tuition_amount, has_student_loan, student_loan_interest, has_teacher_expenses, teacher_expenses, has_eic, eic_qualifying_children, has_car_loan, car_loan_interest, has_home_energy, home_energy_amount, has_child_care, child_care_expenses, child_care_qualifying_children
other-credits: has_hsa, hsa_amount, has_msa, has_adoption, adoption_expenses, has_elderly, has_clean_vehicle, clean_vehicle_amount, has_alternative_fuel, has_mcc, has_employee_business, has_military_moving, has_claim_of_right, has_prior_year_min_tax, has_misc_adjustments
misc-forms: has_estimated_payments, estimated_q1, estimated_q2, estimated_q3, estimated_q4, extension_payment, apply_refund_next_year, next_year_amount, has_foreign_accounts, has_foreign_assets
refund-maximizer: refund_maximizer
state-residency: is_state_resident, is_full_year_resident, has_other_state_income
bank-refund: refund_type, routing, account, bank_account_type, bank_is_foreign, is_multiple_deposit
identity-protection: identity_protection_pin, identity_protection_pin_number
review: phone_option
"""

EXTRACT_TOOL = {
    "type": "function",
    "function": {
        "name": "save_fields",
        "description": "Save extracted tax field values to the database",
        "parameters": {
            "type": "object",
            "properties": {
                "section": {
                    "type": "string",
                    "description": "Section key (e.g. 'personal-info', 'w2-income')",
                },
                "fields": {
                    "type": "object",
                    "description": "Extracted field key-value pairs. Empty object if nothing to extract.",
                },
            },
            "required": ["section", "fields"],
        },
    },
}

# Phase 2 tools — no save_fields (that's handled in Phase 1)
TOOLS_REPLY = [t for t in TOOLS if t["function"]["name"] != "save_fields"]


# Hard format validators applied after normalization — return False to discard the value.
_FORMAT_VALIDATORS: dict[str, callable] = {
    "ssn":                            lambda v: bool(_re.match(r"^\d{9}$", _re.sub(r"[-\s]", "", str(v)))),
    "spouse_ssn":                     lambda v: bool(_re.match(r"^\d{9}$", _re.sub(r"[-\s]", "", str(v)))),
    "zip_code":                       lambda v: bool(_re.match(r"^\d{5}$", str(v).strip())),
    "routing":                        lambda v: bool(_re.match(r"^\d{9}$", str(v).strip())),
    "identity_protection_pin_number": lambda v: bool(_re.match(r"^\d{6}$", str(v).strip())),
    "phone_option":                   lambda v: len(_re.sub(r"\D", "", str(v))) == 10,
}


def _normalize_fields_for_section(section: str, fields: dict) -> dict:
    schema_fields = FIELD_SCHEMA.get(section, {}).get("fields", {})
    result = {}
    for k, v in fields.items():
        meta = schema_fields.get(k)
        if meta:
            ftype = meta.get("type", "text")
            normed = _normalize_value(v, meta)
            if normed is not None:
                # Hard format check (SSN digits, zip digits, routing digits, etc.)
                validator = _FORMAT_VALIDATORS.get(k)
                if validator:
                    try:
                        valid = validator(normed)
                    except Exception:
                        valid = False
                    if not valid:
                        logger.warning(
                            "Hard format validation rejected %s=%r (raw=%r)", k, normed, v
                        )
                        continue  # discard — agent will re-ask
                result[k] = normed
            elif ftype in ("text", "date"):
                # For text/date: preserve raw string so the agent can at least echo
                # it back, but only if it's non-empty.
                raw = str(v).strip()
                if raw:
                    result[k] = raw
            # For radio / select / boolean / number: normalization failure means
            # no valid match — drop entirely so the field stays "missing" and the
            # agent re-asks rather than storing garbage.
        else:
            result[k] = v  # unknown field: pass through unchanged
    return result


def _save_fields_to_db(db: Session, user_id: int, section: str, fields: dict):
    """Route collected fields to the correct DB table/column based on section key."""

    def _get_or_create_tr() -> TaxReturn:
        tr = db.query(TaxReturn).filter_by(user_id=user_id).first()
        if not tr:
            tr = TaxReturn(user_id=user_id)
            db.add(tr)
        return tr

    def _get_or_create_ded() -> Deduction:
        ded = db.query(Deduction).filter_by(user_id=user_id).first()
        if not ded:
            ded = Deduction(user_id=user_id)
            db.add(ded)
        return ded

    def _get_or_create_cred() -> Credit:
        cred = db.query(Credit).filter_by(user_id=user_id).first()
        if not cred:
            cred = Credit(user_id=user_id)
            db.add(cred)
        return cred

    if section == "personal-info":
        tr = _get_or_create_tr()
        ed = dict(tr.extra_data or {})

        # Normalize common field name variations the model might use
        _field_aliases = {
            # Name
            "first": "first_name", "fname": "first_name", "given_name": "first_name",
            "last": "last_name", "lname": "last_name", "surname": "last_name", "family_name": "last_name",
            "middle": "middle_initial", "middle_name": "middle_initial", "mi": "middle_initial",
            # SSN
            "social_security_number": "ssn", "social_security": "ssn", "ss_number": "ssn",
            "sin": "ssn", "tax_id": "ssn",
            # DOB
            "dob": "date_of_birth", "birthday": "date_of_birth", "birth_date": "date_of_birth",
            "date_of_birth": "date_of_birth",
            # Address
            "street": "address", "street_address": "address",
            "apt_number": "apt", "apartment": "apt", "unit": "apt",
            "zip": "zip_code", "postal_code": "zip_code", "zipcode": "zip_code",
            # Job
            "job": "occupation", "profession": "occupation", "title": "occupation",
            # Phone
            "phone": "phone_option", "phone_number": "phone_option",
        }
        normalized = {}
        for k, v in fields.items():
            normalized[_field_aliases.get(k, k)] = v

        # If model gave full_name/name as a single string, split it
        for name_key in ("full_name", "name", "legal_name"):
            if name_key in normalized and isinstance(normalized[name_key], str):
                parts = normalized.pop(name_key).split()
                _suffixes = {"jr", "sr", "ii", "iii", "iv", "v", "jr.", "sr."}
                if parts and parts[-1].lower().rstrip(".") in _suffixes:
                    normalized.setdefault("suffix", parts.pop().upper().rstrip("."))
                if len(parts) >= 2:
                    normalized.setdefault("first_name", parts[0].capitalize())
                    normalized.setdefault("last_name", parts[-1].capitalize())
                    if len(parts) == 3:
                        normalized.setdefault("middle_initial", parts[1][0].upper())
                elif len(parts) == 1:
                    normalized.setdefault("first_name", parts[0].capitalize())

        # middle_initial: keep only first letter
        if "middle_initial" in normalized and isinstance(normalized["middle_initial"], str):
            normalized["middle_initial"] = normalized["middle_initial"][0].upper() if normalized["middle_initial"] else ""

        # Strip dashes/spaces from SSN then hard-validate exactly 9 digits
        if "ssn" in normalized and isinstance(normalized["ssn"], str):
            clean = _re.sub(r"[-\s]", "", normalized["ssn"])
            if _re.match(r"^\d{9}$", clean):
                normalized["ssn"] = clean
            else:
                logger.warning("SSN rejected — got %d digits for %r", len(_re.sub(r"\D", "", clean)), normalized["ssn"])
                del normalized["ssn"]  # leave field missing so agent re-asks

        # Normalize field types
        normalized = _normalize_fields_for_section("personal-info", normalized)

        for k, v in normalized.items():
            if k in _TR_COLUMN_MAP:
                col = "dob" if k == "date_of_birth" else k
                setattr(tr, col, v)
            else:
                ed[k] = v
        tr.extra_data = ed

    elif section == "filing-status":
        tr = _get_or_create_tr()
        ed = dict(tr.extra_data or {})
        fields = _normalize_fields_for_section("filing-status", fields)
        for k, v in fields.items():
            if k == "filing_status":
                tr.filing_status = v
            else:
                ed[k] = v
        tr.extra_data = ed

    elif section == "dependents":
        tr = _get_or_create_tr()
        existing = list(tr.dependents or [])
        if isinstance(fields, list):
            existing = fields
        else:
            existing.append(fields)
        tr.dependents = existing

    elif section == "identity-protection":
        tr = _get_or_create_tr()
        ed = dict(tr.extra_data or {})
        fields = _normalize_fields_for_section("identity-protection", fields)
        ed.update(fields)
        tr.extra_data = ed

    elif section == "w2-income":
        w2 = W2Form(user_id=user_id)
        db.add(w2)
        ed: dict = {}
        # Column aliases — resolve before normalizing
        _w2_alias = {
            "federal_tax_withheld": "federal_withheld",
            "social_security_tax_withheld": "ss_withheld",
            "medicare_tax_withheld": "medicare_withheld",
            "state_tax_withheld": "state_withheld",
            "box12_code1": "box12_code",
            "box12_amount1": "box12_amount",
        }
        aliased = {_w2_alias.get(k, k): v for k, v in fields.items()}
        aliased = _normalize_fields_for_section("w2-income", aliased)
        for k, v in aliased.items():
            if hasattr(w2, k):
                setattr(w2, k, v)
            else:
                ed[k] = v
        w2.extra_data = ed

    elif section == "1099-income":
        fields = _normalize_fields_for_section("1099-income", fields)
        # Strip "1099-" prefix if present in form_type value
        form_type_raw = fields.get("form_type", fields.get("type", "NEC"))
        form_type = str(form_type_raw).replace("1099-", "").upper()
        f1099 = Form1099(user_id=user_id, form_type=form_type, raw_json=fields)
        db.add(f1099)
        for k, v in fields.items():
            if hasattr(f1099, k):
                setattr(f1099, k, v)

    elif section == "other-income":
        tr = _get_or_create_tr()
        existing = dict(tr.other_income or {})
        fields = _normalize_fields_for_section("other-income", fields)
        existing.update(fields)
        tr.other_income = existing

    elif section == "deductions":
        ded = _get_or_create_ded()
        other = dict(ded.other_json or {})
        fields = _normalize_fields_for_section("deductions", fields)
        # Map TS field names → DB column names for the few explicit columns
        _ded_col_map = {
            "type": "type",
            "mortgage_interest": "mortgage_interest",
            "charitable_cash": "charitable_cash",
            "cash_donations": "charitable_cash",        # TS name alias
            "student_loan_interest": "student_loan_interest",
        }
        for k, v in fields.items():
            if k in _ded_col_map:
                setattr(ded, _ded_col_map[k], v)
            else:
                other[k] = v
        ded.other_json = other

    elif section in ("health-insurance", "common-credits", "other-credits"):
        cred = _get_or_create_cred()
        other = dict(cred.other_json or {})
        fields = _normalize_fields_for_section(section, fields)
        # Map TS field names → DB column names for the few explicit columns
        _cred_col_map = {
            "child_tax_credit_count": "child_tax_credit_count",
            "education_credit_type": "education_credit_type",
            "eitc_qualifying_children": "eitc_qualifying_children",
            "eic_qualifying_children": "eitc_qualifying_children",  # TS name alias
        }
        for k, v in fields.items():
            if k in _cred_col_map:
                setattr(cred, _cred_col_map[k], v)
            else:
                other[k] = v
        cred.other_json = other

    elif section in ("misc-forms", "refund-maximizer"):
        tr = _get_or_create_tr()
        existing = dict(tr.misc_info or {})
        fields = _normalize_fields_for_section(section, fields)
        existing.update(fields)
        tr.misc_info = existing

    elif section in ("state-residency", "state-return"):
        tr = _get_or_create_tr()
        existing = dict(tr.state_info or {})
        fields = _normalize_fields_for_section(section, fields)
        existing.update(fields)
        tr.state_info = existing

    elif section == "bank-refund":
        tr = _get_or_create_tr()
        ed = dict(tr.extra_data or {})
        fields = _normalize_fields_for_section("bank-refund", fields)
        for k, v in fields.items():
            if k == "routing":
                tr.direct_deposit_routing = v
            elif k == "account":
                tr.direct_deposit_account = v
            elif k in _TR_COLUMN_MAP:
                setattr(tr, k, v)
            else:
                ed[k] = v
        tr.extra_data = ed

    elif section == "review":
        tr = _get_or_create_tr()
        ed = dict(tr.extra_data or {})
        ed.update(fields)
        tr.extra_data = ed

    else:
        # Unknown section: fallback to extra_data
        tr = _get_or_create_tr()
        ed = dict(tr.extra_data or {})
        ed[section] = fields
        tr.extra_data = ed

    db.commit()


def _build_user_data(db: Session, user_id: int) -> dict:
    """Build the user_data dict from DB state for field manifest filtering."""
    user_data: dict = {}

    tax_return = db.query(TaxReturn).filter_by(user_id=user_id).first()
    if tax_return and tax_return.filing_status:
        user_data["filing_status"] = tax_return.filing_status

    income_types = []
    w2s = db.query(W2Form).filter_by(user_id=user_id).all()
    if w2s:
        income_types.append("w2")
    form_1099s = db.query(Form1099).filter_by(user_id=user_id).all()
    for f in form_1099s:
        form_key = f"1099-{f.form_type}"
        if form_key not in income_types:
            income_types.append(form_key)
        if f.form_type == "NEC":
            income_types.append("self_employment")
    if income_types:
        user_data["income_types"] = income_types

    deduction = db.query(Deduction).filter_by(user_id=user_id).first()
    if deduction and deduction.type:
        user_data["deduction_method"] = deduction.type

    credit = db.query(Credit).filter_by(user_id=user_id).first()
    if credit:
        active_credits = []
        if credit.education_credit_type:
            active_credits.append("education")
        if credit.child_tax_credit_count and credit.child_tax_credit_count > 0:
            active_credits.append("child_tax_credit")
        if credit.eitc_qualifying_children is not None:
            active_credits.append("eitc")
        if active_credits:
            user_data["credits"] = active_credits
        if credit.other_json:
            accounts = []
            other = credit.other_json if isinstance(credit.other_json, dict) else {}
            if other.get("hsa"):
                accounts.append("hsa")
            if other.get("ira"):
                accounts.append("ira")
            if accounts:
                user_data["accounts"] = accounts

    return user_data


async def run_chat_turn(
    db: Session,
    session: ChatSession,
    user_message: str,
) -> dict:
    """
    Three-phase processing:
      Phase 1   — Force save_fields to extract any fields from the user message.
      Phase 1.5 — Targeted interpretation fallback: if Phase 1 captured nothing but required
                  fields are still missing, run a focused LLM call to interpret the user's
                  answer in context of the specific field being asked.
      Phase 2   — Generate conversational reply. If Phase 1.5 also failed, the system prompt
                  carries a ⚠️ RE-ASK signal so the agent loops on the same question.
    """
    # Persist user message
    db.add(ChatMessage(session_id=session.id, role="user", content=user_message))
    db.commit()

    # Build full conversation history (includes the message we just persisted)
    history = db.query(ChatMessage).filter_by(session_id=session.id).order_by(ChatMessage.id).all()

    client = OpenAI(api_key=settings.openai_api_key)
    current_section = session.current_section or "personal-info"
    fields_were_saved = False

    # Compute field hints for the current section (used in both phases)
    section_field_hints = _get_section_field_hints(current_section)

    # Snapshot of missing required fields BEFORE extraction (used to detect stuck turns)
    missing_before = _get_missing_required_fields(db, session.user_id, current_section)

    # ── Phase 1: Forced extraction ────────────────────────────────────────────
    # Find the last assistant message for context (helps map yes/no to the right field)
    last_assistant_content = None
    for msg in history:
        if msg.role == "assistant":
            last_assistant_content = msg.content

    extract_messages = [
        {
            "role": "system",
            "content": EXTRACT_SYSTEM_PROMPT.format(
                current_section=current_section,
                section_field_hints=section_field_hints,
            ),
        },
    ]
    if last_assistant_content:
        extract_messages.append({"role": "assistant", "content": last_assistant_content})
    extract_messages.append({"role": "user", "content": user_message})

    try:
        extract_response = client.chat.completions.create(
            model=PARSE_MODEL,
            max_completion_tokens=512,
            messages=extract_messages,
            tools=[EXTRACT_TOOL],
            tool_choice={"type": "function", "function": {"name": "save_fields"}},
        )
        extract_msg = extract_response.choices[0].message
        if extract_msg.tool_calls:
            for tc in extract_msg.tool_calls:
                if tc.function.name == "save_fields":
                    args = json.loads(tc.function.arguments)
                    section_key = args.get("section", current_section)
                    # Model sometimes puts fields at top level instead of nested
                    fields_data = args.get("fields") or {
                        k: v for k, v in args.items() if k != "section"
                    }
                    logger.info("Phase1 extract: section=%s fields=%s", section_key, fields_data)
                    if fields_data:  # skip if nothing was extracted
                        _save_fields_to_db(db, session.user_id, section_key, fields_data)
                        fields_were_saved = True
    except Exception as exc:
        logger.warning("Phase 1 extraction failed: %s", exc)

    # ── Phase 1.5: Targeted interpretation fallback ───────────────────────────
    # Only runs when Phase 1 got nothing AND there are still required fields missing
    # AND the user sent a substantive reply (not a greeting or "start").
    _greetings = {"start", "hi", "hello", "hey", "okay", "ok", "sure", "yes", "no"}
    is_substantive = user_message.strip().lower() not in _greetings and len(user_message.strip()) > 2

    if not fields_were_saved and missing_before and last_assistant_content and is_substantive:
        first_missing = missing_before[0]
        schema_fields = FIELD_SCHEMA.get(current_section, {}).get("fields", {})
        field_meta = schema_fields.get(first_missing, {"type": "text"})
        ftype = field_meta.get("type", "text")
        options = field_meta.get("options", [])

        validation_hint = _get_field_validation_hint(first_missing, field_meta)

        interp_lines = [
            f"A tax assistant asked the user a question. Your job: extract and validate the value for field '{first_missing}'.",
            f"",
            f"Question asked (last assistant message):",
            last_assistant_content[-400:],
            f"",
            f"User's response: {user_message}",
            f"",
        ]
        if ftype in ("radio", "select") and options:
            interp_lines.append(f"Output EXACTLY one of these options (nothing else): {options}")
            interp_lines.append("Interpret the user's intent liberally — e.g. 'we file together' → 'Married Filing Jointly'.")
            interp_lines.append("If you genuinely cannot determine which option applies, output: UNCLEAR")
        elif ftype == "boolean":
            interp_lines.append("Output EXACTLY 'true' or 'false'. Interpret liberally — 'I think so' → 'true', 'nah' → 'false'.")
            interp_lines.append("If you cannot determine, output: UNCLEAR")
        elif ftype == "date":
            interp_lines.append("Output the date in YYYY-MM-DD format. Reformat any date style into YYYY-MM-DD.")
            interp_lines.append("If no date found, output: UNCLEAR")
        elif ftype == "number":
            interp_lines.append("Output the number only (no $ or commas). If no number found, output: UNCLEAR")
        else:
            interp_lines.append("Output the extracted text value only. If nothing relevant found, output: UNCLEAR")
        if validation_hint:
            interp_lines.append(f"")
            interp_lines.append(f"VALIDATION — output UNCLEAR if the value fails: {validation_hint}")

        try:
            interp_resp = client.chat.completions.create(
                model=PARSE_MODEL,
                max_completion_tokens=64,
                messages=[{"role": "user", "content": "\n".join(interp_lines)}],
                temperature=0,
            )
            interp_value = interp_resp.choices[0].message.content.strip()
            if interp_value.upper() != "UNCLEAR" and interp_value:
                normed = _normalize_value(interp_value, field_meta)
                if normed is not None:
                    _save_fields_to_db(db, session.user_id, current_section, {first_missing: interp_value})
                    fields_were_saved = True
                    logger.info(
                        "Phase1.5 interpretation: %s=%r -> %r (for '%s')",
                        first_missing, interp_value, normed, user_message[:60],
                    )
        except Exception as exc:
            logger.warning("Phase 1.5 interpretation failed: %s", exc)

    # ── Compute missing required fields (after Phase 1 + 1.5) ────────────────
    missing_after = _get_missing_required_fields(db, session.user_id, current_section)
    # Detect a "stuck" turn: user answered something but we still couldn't capture the field
    still_stuck = (
        not fields_were_saved
        and bool(missing_before)
        and set(missing_before) == set(missing_after)
        and is_substantive
    )

    if missing_after:
        missing_fields_text = "These required fields are still missing:\n" + "\n".join(
            f"  - {f}" for f in missing_after
        )
        if still_stuck:
            missing_fields_text += (
                f"\n\n⚠️ RE-ASK REQUIRED: The user responded but no valid value could be captured for "
                f"'{missing_after[0]}'. Re-ask this exact question — explicitly state the expected "
                f"format or list the valid options. Do NOT move to the next question or section."
            )
    else:
        missing_fields_text = "All required fields for this section are collected."

    # ── Phase 2: Conversational reply ─────────────────────────────────────────
    pdf_sections = ", ".join(get_pdf_upload_sections())
    existing_data_summary = _build_existing_data_summary(db, session.user_id)
    system = SYSTEM_PROMPT_TEMPLATE.format(
        pdf_upload_sections=pdf_sections,
        existing_data_summary=existing_data_summary,
        missing_fields_text=missing_fields_text,
    )

    messages = [{"role": "system", "content": system}]
    messages += [{"role": m.role, "content": m.content} for m in history]

    request_pdf_upload = False
    pdf_upload_reason = None
    assistant_text = ""
    navigate_to_section_value = None

    # Agentic loop — navigate_to_section and request_pdf_upload only (no save_fields)
    while True:
        response = client.chat.completions.create(
            model=MODEL,
            max_completion_tokens=2048,
            messages=messages,
            tools=TOOLS_REPLY,
            tool_choice="auto",
        )

        message = response.choices[0].message
        finish_reason = response.choices[0].finish_reason

        if message.content:
            assistant_text += message.content

        if finish_reason == "stop":
            break

        if finish_reason == "tool_calls" and message.tool_calls:
            messages.append({
                "role": "assistant",
                "content": message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in message.tool_calls
                ],
            })

            for tool_call in message.tool_calls:
                tool_name = tool_call.function.name
                tool_input = json.loads(tool_call.function.arguments)

                if tool_name == "navigate_to_section":
                    navigate_to_section_value = tool_input["section"]
                    session.current_section = tool_input["section"]
                    db.commit()
                    result_content = f"Navigated to '{tool_input['section']}'."

                elif tool_name == "request_pdf_upload":
                    request_pdf_upload = True
                    pdf_upload_reason = tool_input["reason"]
                    result_content = "PDF upload requested."

                elif tool_name == "mark_section_complete":
                    result_content = "ok"

                else:
                    result_content = f"Unknown tool: {tool_name}"

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result_content,
                })

            continue

        break

    # Persist assistant reply
    if assistant_text:
        db.add(ChatMessage(session_id=session.id, role="assistant", content=assistant_text))
        db.commit()

    # Always build snapshot so the frontend stays in sync with DB after every turn
    snapshot = _build_snapshot(db, session.user_id)

    return {
        "reply": assistant_text,
        "request_pdf_upload": request_pdf_upload,
        "pdf_upload_reason": pdf_upload_reason,
        "session_status": session.status,
        "navigate_to_section": navigate_to_section_value,
        "snapshot": snapshot,
    }
