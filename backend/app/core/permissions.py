from enum import Enum

from app.enums import Role


class Permission(str, Enum):
    ADMIN_CREATE = "admin.create"
    SUPER_ADMIN_CREATE = "super_admin.create"
    DOCTOR_CREATE = "doctor.create"
    ATTENDER_CREATE = "attender.create"
    PATIENT_CREATE = "patient.create"
    HOSPITAL_MANAGE = "hospital.manage"
    HOSPITAL_VIEW = "hospital.view"
    DOCTOR_DIRECTORY_VIEW = "doctor.directory.view"
    PATIENT_DIRECTORY_VIEW = "patient.directory.view"
    APPOINTMENT_MANAGE = "appointment.manage"
    APPOINTMENT_VIEW = "appointment.view"
    PATIENT_CLINICAL_VIEW = "patient.clinical.view"
    PATIENT_CLINICAL_WRITE = "patient.clinical.write"
    LAB_UPLOAD = "lab.upload"
    LAB_VIEW = "lab.view"
    AUDIT_VIEW = "audit.view"


_ALL_PERMISSIONS = frozenset(Permission)
_ROLE_PERMISSIONS = {
    Role.SUPER_ADMIN: _ALL_PERMISSIONS,
    Role.ADMIN: _ALL_PERMISSIONS
    - {
        Permission.ADMIN_CREATE,
        Permission.SUPER_ADMIN_CREATE,
        Permission.HOSPITAL_MANAGE,
    },
    Role.DOCTOR: frozenset(
        {
            Permission.ATTENDER_CREATE,
            Permission.PATIENT_CREATE,
            Permission.PATIENT_DIRECTORY_VIEW,
            Permission.APPOINTMENT_MANAGE,
            Permission.APPOINTMENT_VIEW,
            Permission.PATIENT_CLINICAL_VIEW,
            Permission.PATIENT_CLINICAL_WRITE,
            Permission.LAB_UPLOAD,
            Permission.LAB_VIEW,
        }
    ),
    Role.ATTENDER: frozenset(
        {
            Permission.PATIENT_CREATE,
            Permission.PATIENT_DIRECTORY_VIEW,
            Permission.DOCTOR_DIRECTORY_VIEW,
            Permission.APPOINTMENT_MANAGE,
            Permission.APPOINTMENT_VIEW,
            Permission.LAB_UPLOAD,
        }
    ),
    Role.PATIENT: frozenset(
        {
            Permission.DOCTOR_DIRECTORY_VIEW,
            Permission.APPOINTMENT_MANAGE,
            Permission.APPOINTMENT_VIEW,
            Permission.PATIENT_CLINICAL_VIEW,
            Permission.LAB_VIEW,
        }
    ),
}


def has_permission(role: Role, permission: Permission) -> bool:
    return permission in _ROLE_PERMISSIONS[role]
