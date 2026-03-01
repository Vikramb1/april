from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import DeclarativeBase, relationship


def utcnow():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    sessions = relationship("ChatSession", back_populates="user")
    tax_returns = relationship("TaxReturn", back_populates="user")
    w2_forms = relationship("W2Form", back_populates="user")
    form_1099s = relationship("Form1099", back_populates="user")
    deductions = relationship("Deduction", back_populates="user")
    credits = relationship("Credit", back_populates="user")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="collecting")  # collecting | complete
    current_section = Column(String, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="sessions")
    messages = relationship("ChatMessage", back_populates="session")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    session = relationship("ChatSession", back_populates="messages")


class TaxReturn(Base):
    __tablename__ = "tax_returns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tax_year = Column(Integer, nullable=True)
    filing_status = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    ssn = Column(String, nullable=True)
    dob = Column(String, nullable=True)
    address = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    direct_deposit_routing = Column(String, nullable=True)
    direct_deposit_account = Column(String, nullable=True)
    extra_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="tax_returns")


class W2Form(Base):
    __tablename__ = "w2_forms"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    employer_name = Column(String, nullable=True)
    ein = Column(String, nullable=True)
    wages = Column(Float, nullable=True)
    federal_withheld = Column(Float, nullable=True)
    ss_withheld = Column(Float, nullable=True)
    medicare_withheld = Column(Float, nullable=True)
    state_withheld = Column(Float, nullable=True)
    state_wages = Column(Float, nullable=True)
    local_withheld = Column(Float, nullable=True)
    box12_code = Column(String, nullable=True)
    box12_amount = Column(Float, nullable=True)
    extra_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="w2_forms")


class Form1099(Base):
    __tablename__ = "form_1099s"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    form_type = Column(String, nullable=False)  # NEC | INT | DIV | B
    payer_name = Column(String, nullable=True)
    payer_tin = Column(String, nullable=True)
    amount = Column(Float, nullable=True)
    federal_withheld = Column(Float, nullable=True)
    raw_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="form_1099s")


class Deduction(Base):
    __tablename__ = "deductions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=True)  # standard | itemized
    mortgage_interest = Column(Float, nullable=True)
    charitable_cash = Column(Float, nullable=True)
    student_loan_interest = Column(Float, nullable=True)
    other_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="deductions")


class Credit(Base):
    __tablename__ = "credits"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    child_tax_credit_count = Column(Integer, nullable=True)
    education_credit_type = Column(String, nullable=True)
    eitc_qualifying_children = Column(Integer, nullable=True)
    other_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="credits")
