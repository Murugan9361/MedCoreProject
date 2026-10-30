import re
from datetime import date


def normalize_phone(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if len(digits) != 10:
        raise ValueError("Phone must have 10 digits, e.g. (000) 000-0000")
    return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"


def ensure_past_date(value: date) -> date:
    if value >= date.today():
        raise ValueError("Date must be in the past")
    return value


def validate_password(value: str) -> str:
    if len(value) < 12:
        raise ValueError("Password must be at least 12 characters")
    if not re.search(r"[a-z]", value):
        raise ValueError("Password must include a lowercase letter")
    if not re.search(r"[A-Z]", value):
        raise ValueError("Password must include an uppercase letter")
    if not re.search(r"\d", value):
        raise ValueError("Password must include a number")
    if not re.search(r"[^A-Za-z0-9]", value):
        raise ValueError("Password must include a symbol")
    return value
