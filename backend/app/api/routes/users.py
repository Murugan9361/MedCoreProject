from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.permissions import Permission, has_permission
from app.core.security import hash_password
from app.enums import Role
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.services.audit_service import log_action

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_my_users(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> list[User]:
    return db.query(User).filter(User.created_by == current.id).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> User:
    if data.role in (Role.ADMIN, Role.DOCTOR):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use POST /admins or POST /doctors",
        )
    if data.role != Role.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use the role-specific creation endpoint",
        )
    if not has_permission(current.role, Permission.SUPER_ADMIN_CREATE):
        log_action(
            db,
            current,
            "super_admin_create_denied",
            "user",
            None,
            request=request,
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a super admin can create a super admin",
        )
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = User(
        full_name=data.full_name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role=Role.SUPER_ADMIN,
        created_by=current.id,
        must_change_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_action(
        db,
        current,
        "staff.create",
        Role.SUPER_ADMIN.value,
        user.id,
        request=request,
    )
    return user


@router.get("/{user_id}", response_model=UserOut)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
) -> User:
    if current.role not in (Role.SUPER_ADMIN, Role.ADMIN) and current.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}")
def update_user(
    user_id: int,
    data: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if current.role not in (Role.SUPER_ADMIN, Role.ADMIN):
        raise HTTPException(status_code=403, detail="Only admins can edit user accounts")

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == Role.SUPER_ADMIN and current.role != Role.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only a Super Admin can modify another Super Admin")

    if data.full_name is not None and data.full_name.strip():
        user.full_name = data.full_name.strip()
    if data.email is not None and data.email.strip():
        new_email = data.email.strip().lower()
        existing = db.query(User).filter(User.email == new_email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email is already used by another account")
        user.email = new_email
    if data.password is not None and data.password.strip():
        user.hashed_password = hash_password(data.password.strip())
        user.token_version += 1
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active

    # Update staff_profile if it exists
    if user.staff_profile:
        if data.department is not None:
            user.staff_profile.department = data.department.strip()
        if data.designation is not None:
            user.staff_profile.designation = data.designation.strip()
        if data.phone is not None:
            user.staff_profile.phone = data.phone.strip()
        if data.hospital_id is not None:
            user.staff_profile.hospital_id = data.hospital_id

    # Update patient profile if it exists
    if user.profile:
        if data.phone is not None:
            user.profile.phone = data.phone.strip()
        if data.hospital_id is not None:
            user.profile.hospital_id = data.hospital_id

    # Update doctor_details if it exists
    if user.doctor_details:
        if data.specialization is not None:
            user.doctor_details.specialization = data.specialization.strip()
        if data.consultation_fee is not None:
            user.doctor_details.consultation_fee = data.consultation_fee

    db.commit()
    db.refresh(user)
    log_action(db, current, "user.update", "user", user.id, request=request)
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "is_active": user.is_active,
        "message": "User updated successfully",
    }


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if current.role not in (Role.SUPER_ADMIN, Role.ADMIN):
        raise HTTPException(status_code=403, detail="Only admins can delete user accounts")

    if current.id == user_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete your own active administrator account",
        )

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == Role.SUPER_ADMIN and current.role != Role.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only a Super Admin can delete another Super Admin")

    try:
        # 1. Clear foreign key references from created_by in other users
        db.query(User).filter(User.created_by == user_id).update(
            {User.created_by: None}, synchronize_session=False
        )

        # 2. Delete / unlink child records
        from app.models.refresh_token import RefreshToken
        from app.models.audit_log import AuditLog
        from app.models.staff_profile import StaffProfile
        from app.models.doctor_details import DoctorDetails
        from app.models.attender_details import AttenderDetails
        from app.models.patient_profile import PatientProfile
        from app.models.doctor_patient import DoctorPatient
        from app.models.appointment import Appointment
        from app.models.consultation_record import ConsultationRecord
        from app.models.lab_file import LabFile

        # Tokens and audit
        db.query(RefreshToken).filter(RefreshToken.user_id == user_id).delete(
            synchronize_session=False
        )
        db.query(AuditLog).filter(AuditLog.user_id == user_id).delete(
            synchronize_session=False
        )

        # Profiles and attender/doctor relationships
        db.query(DoctorPatient).filter(
            or_(DoctorPatient.doctor_id == user_id, DoctorPatient.patient_id == user_id)
        ).delete(synchronize_session=False)
        db.query(DoctorDetails).filter(DoctorDetails.user_id == user_id).delete(
            synchronize_session=False
        )
        # Unlink attender doctor_id if this user is assigned as the attender's doctor
        db.query(AttenderDetails).filter(AttenderDetails.doctor_id == user_id).update(
            {AttenderDetails.doctor_id: None}, synchronize_session=False
        )
        db.query(AttenderDetails).filter(AttenderDetails.user_id == user_id).delete(
            synchronize_session=False
        )
        db.query(StaffProfile).filter(StaffProfile.user_id == user_id).delete(
            synchronize_session=False
        )
        db.query(PatientProfile).filter(PatientProfile.user_id == user_id).delete(
            synchronize_session=False
        )

        # Consultation records (Note: author_id and patient_id; there is no doctor_id on ConsultationRecord)
        db.query(ConsultationRecord).filter(
            or_(
                ConsultationRecord.patient_id == user_id,
                ConsultationRecord.author_id == user_id,
            )
        ).delete(synchronize_session=False)

        # Unlink appointments from consultation records if any remaining
        user_appt_ids = [
            a[0]
            for a in db.query(Appointment.id)
            .filter(
                or_(
                    Appointment.doctor_id == user_id,
                    Appointment.patient_id == user_id,
                    Appointment.booked_by == user_id,
                )
            )
            .all()
        ]
        if user_appt_ids:
            db.query(ConsultationRecord).filter(
                ConsultationRecord.appointment_id.in_(user_appt_ids)
            ).update({ConsultationRecord.appointment_id: None}, synchronize_session=False)

        try:
            from app.models.billing import Bill, BillItem, Payment

            if user_appt_ids:
                db.query(Bill).filter(
                    Bill.appointment_id.in_(user_appt_ids)
                ).update({Bill.appointment_id: None}, synchronize_session=False)

            user_bill_ids = [
                b[0]
                for b in db.query(Bill.id)
                .filter(or_(Bill.patient_id == user_id, Bill.created_by == user_id))
                .all()
            ]
            if user_bill_ids:
                db.query(Payment).filter(Payment.bill_id.in_(user_bill_ids)).delete(
                    synchronize_session=False
                )
                db.query(BillItem).filter(BillItem.bill_id.in_(user_bill_ids)).delete(
                    synchronize_session=False
                )
                db.query(Bill).filter(Bill.id.in_(user_bill_ids)).delete(
                    synchronize_session=False
                )

            db.query(Payment).filter(Payment.received_by == user_id).delete(
                synchronize_session=False
            )
        except Exception:
            pass

        # Appointments
        db.query(Appointment).filter(
            or_(
                Appointment.doctor_id == user_id,
                Appointment.patient_id == user_id,
                Appointment.booked_by == user_id,
            )
        ).delete(synchronize_session=False)

        # Lab files
        db.query(LabFile).filter(
            or_(LabFile.patient_id == user_id, LabFile.uploaded_by == user_id)
        ).delete(synchronize_session=False)

        db.delete(user)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Failed to delete user: {str(exc)}"
        )

    log_action(db, current, "user.delete", "user", user_id, request=request)
    return {"status": "ok", "message": f"User #{user_id} deleted successfully"}
