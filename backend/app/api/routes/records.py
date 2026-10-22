from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import require_permission
from app.core.database import get_db
from app.core.permissions import Permission
from app.enums import Role
from app.models.consultation_record import ConsultationRecord
from app.models.lab_file import LabFile
from app.models.user import User
from app.schemas.records import LabFileOut, RecordCreate, RecordOut
from app.services.access_service import get_patient_for_user, user_hospital_id
from app.services.audit_service import log_action
from app.services.file_service import save_upload, stored_file_path, upload_dir
from app.services.record_service import (
    check_appointment,
    create_record,
    get_lab_file_for_user,
)

router = APIRouter(prefix="/patients", tags=["records"])
files_router = APIRouter(prefix="/lab-files", tags=["records"])


@router.post("/{patient_id}/records", response_model=RecordOut, status_code=201)
def add_record(
    patient_id: int,
    data: RecordCreate,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(
        require_permission(Permission.PATIENT_CLINICAL_WRITE)
    ),
) -> ConsultationRecord:
    patient = get_patient_for_user(
        db,
        current,
        patient_id,
        request,
        action="record.create",
        log_success=False,
    )
    return create_record(db, current, patient, data, request)


@router.get("/{patient_id}/records", response_model=list[RecordOut])
def list_records(
    patient_id: int,
    request: Request,
    prescriptions_only: bool = False,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current: User = Depends(
        require_permission(Permission.PATIENT_CLINICAL_VIEW)
    ),
) -> list[ConsultationRecord]:
    patient = get_patient_for_user(
        db,
        current,
        patient_id,
        request,
        action="record.list",
        log_success=False,
    )
    query = db.query(ConsultationRecord).filter(
        ConsultationRecord.patient_id == patient.id
    )
    if prescriptions_only:
        query = query.filter(ConsultationRecord.prescription.isnot(None))
    records = (
        query.order_by(ConsultationRecord.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    if current.role != Role.PATIENT:
        if records:
            for record in records:
                log_action(
                    db,
                    current,
                    "record.list",
                    "consultation_record",
                    record.id,
                    hospital_id=record.hospital_id,
                    request=request,
                )
        else:
            log_action(
                db,
                current,
                "record.list",
                "patient",
                patient.id,
                hospital_id=user_hospital_id(patient),
                request=request,
            )
    return records


@router.post(
    "/{patient_id}/lab-files",
    response_model=LabFileOut,
    status_code=201,
)
def upload_lab_file(
    patient_id: int,
    request: Request,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None, max_length=500),
    appointment_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.LAB_UPLOAD)),
) -> LabFile:
    patient = get_patient_for_user(
        db,
        current,
        patient_id,
        request,
        action="lab.upload",
        log_success=False,
    )
    check_appointment(db, current, patient, appointment_id)
    hospital_id = user_hospital_id(patient)
    if hospital_id is None and current.role == Role.DOCTOR:
        hospital_id = user_hospital_id(current)
    if hospital_id is None:
        raise HTTPException(400, "Patient must belong to a hospital")
    saved = save_upload(file)
    lab_file = LabFile(
        patient_id=patient.id,
        hospital_id=hospital_id,
        appointment_id=appointment_id,
        uploaded_by=current.id,
        description=description,
        **saved,
    )
    try:
        db.add(lab_file)
        db.commit()
    except Exception:
        db.rollback()
        (upload_dir() / saved["stored_name"]).unlink(missing_ok=True)
        raise
    db.refresh(lab_file)
    log_action(
        db,
        current,
        "lab.upload",
        "lab_file",
        lab_file.id,
        hospital_id=lab_file.hospital_id,
        request=request,
    )
    return lab_file


@router.get(
    "/{patient_id}/lab-files",
    response_model=list[LabFileOut],
)
def list_lab_files(
    patient_id: int,
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.LAB_VIEW)),
) -> list[LabFile]:
    patient = get_patient_for_user(
        db,
        current,
        patient_id,
        request,
        action="lab.list",
        log_success=False,
    )
    files = (
        db.query(LabFile)
        .filter(LabFile.patient_id == patient.id)
        .order_by(LabFile.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    if current.role != Role.PATIENT:
        if files:
            for lab_file in files:
                log_action(
                    db,
                    current,
                    "lab.list",
                    "lab_file",
                    lab_file.id,
                    hospital_id=lab_file.hospital_id,
                    request=request,
                )
        else:
            log_action(
                db,
                current,
                "lab.list",
                "patient",
                patient.id,
                hospital_id=user_hospital_id(patient),
                request=request,
            )
    return files


@files_router.get("/{file_id}/download")
def download_lab_file(
    file_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current: User = Depends(require_permission(Permission.LAB_VIEW)),
) -> FileResponse:
    lab_file = get_lab_file_for_user(db, current, file_id, request)
    path = stored_file_path(lab_file.stored_name)
    return FileResponse(
        path,
        media_type=lab_file.content_type,
        filename=lab_file.original_name,
        headers={
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-store",
        },
    )
