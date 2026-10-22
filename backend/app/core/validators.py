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
