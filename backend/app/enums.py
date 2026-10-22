import enum


class Role(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    DOCTOR = "doctor"
    ATTENDER = "attender"
    PATIENT = "patient"

class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"

class MaritalStatus(str, enum.Enum):
    SINGLE = "single"
    MARRIED = "married"
    DIVORCED = "divorced"
    WIDOWED = "widowed"
    LONG_TERM_PARTNERSHIP = "long_term_partnership"

class BloodType(str, enum.Enum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"


class Shift(str, enum.Enum):
    MORNING = "morning"
    EVENING = "evening"
    NIGHT = "night"


class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


CREATABLE_ROLES = {
    Role.SUPER_ADMIN: [Role.ADMIN, Role.DOCTOR, Role.ATTENDER, Role.PATIENT],
    Role.ADMIN: [Role.DOCTOR, Role.ATTENDER, Role.PATIENT],
    Role.DOCTOR: [Role.ATTENDER, Role.PATIENT],
    Role.ATTENDER: [Role.PATIENT],
    Role.PATIENT: [],
}

EMPLOYEE_PREFIX = {
    Role.ADMIN: "ADM",
    Role.DOCTOR: "DOC",
    Role.ATTENDER: "ATT",
}
