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
    ROLE_DIRECTORY_VIEW = "role.directory.view"
    PATIENT_PROFILE_UPDATE = "patient.profile.update"
    BILLING_MANAGE = "billing.manage"
    BILLING_VIEW = "billing.view"
    PAYMENT_RECORD = "payment.record"
    REPORT_VIEW = "report.view"


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
            Permission.DOCTOR_DIRECTORY_VIEW,
            Permission.APPOINTMENT_MANAGE,
            Permission.APPOINTMENT_VIEW,
            Permission.PATIENT_CLINICAL_VIEW,
            Permission.PATIENT_CLINICAL_WRITE,
            Permission.LAB_UPLOAD,
            Permission.LAB_VIEW,
            Permission.ROLE_DIRECTORY_VIEW,
            Permission.BILLING_MANAGE,
            Permission.BILLING_VIEW,
            Permission.PAYMENT_RECORD,
            Permission.REPORT_VIEW,
        }
    ),
    Role.ATTENDER: frozenset(
        {
            Permission.PATIENT_CREATE,
            Permission.PATIENT_DIRECTORY_VIEW,
            Permission.DOCTOR_DIRECTORY_VIEW,
            Permission.APPOINTMENT_MANAGE,
            Permission.APPOINTMENT_VIEW,
            Permission.PATIENT_CLINICAL_VIEW,
            Permission.PATIENT_CLINICAL_WRITE,
            Permission.LAB_UPLOAD,
            Permission.LAB_VIEW,
            Permission.BILLING_MANAGE,
            Permission.BILLING_VIEW,
            Permission.PAYMENT_RECORD,
            Permission.REPORT_VIEW,
        }
    ),
    Role.PATIENT: frozenset(
        {
            Permission.DOCTOR_DIRECTORY_VIEW,
            Permission.APPOINTMENT_MANAGE,
            Permission.APPOINTMENT_VIEW,
            Permission.PATIENT_CLINICAL_VIEW,
            Permission.LAB_UPLOAD,
            Permission.LAB_VIEW,
            Permission.PATIENT_PROFILE_UPDATE,
            Permission.BILLING_MANAGE,
            Permission.BILLING_VIEW,
            Permission.PAYMENT_RECORD,
            Permission.REPORT_VIEW,
        }
    ),
}


def has_permission(role: Role, permission: Permission) -> bool:
    return permission in _ROLE_PERMISSIONS[role]
