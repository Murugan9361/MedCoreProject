import os
import re
import uuid
from pathlib import Path
from typing import TypedDict

from fastapi import HTTPException, UploadFile

from app.core.config import settings

ALLOWED = {
    ".pdf": ("application/pdf", b"%PDF-"),
    ".jpg": ("image/jpeg", b"\xff\xd8\xff"),
    ".jpeg": ("image/jpeg", b"\xff\xd8\xff"),
}
CHUNK = 1024 * 1024
STORED_NAME_PATTERN = re.compile(r"[0-9a-f]{32}\.(?:pdf|jpg|jpeg)\Z")


class SavedUpload(TypedDict):
    original_name: str
    stored_name: str
    content_type: str
    size_bytes: int


def upload_dir() -> Path:
    path = Path(settings.UPLOAD_DIR).resolve()
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_upload(file: UploadFile) -> SavedUpload:
    name = os.path.basename((file.filename or "").replace("\\", "/"))[:200]
    extension = Path(name).suffix.lower()
    if extension not in ALLOWED:
        raise HTTPException(400, "Only .pdf, .jpg and .jpeg files are allowed")

    content_type, magic = ALLOWED[extension]
    if not file.file.read(len(magic)).startswith(magic):
        raise HTTPException(400, "File content does not match its type")
    file.file.seek(0)

    stored_name = f"{uuid.uuid4().hex}{extension}"
    path = upload_dir() / stored_name
    limit = settings.MAX_UPLOAD_MB * 1024 * 1024
    if settings.MAX_UPLOAD_MB < 1:
        raise RuntimeError("MAX_UPLOAD_MB must be at least 1")
    size = 0
    try:
        with path.open("xb") as output:
            while chunk := file.file.read(CHUNK):
                size += len(chunk)
                if size > limit:
                    raise HTTPException(
                        413,
                        f"File is larger than {settings.MAX_UPLOAD_MB} MB",
                    )
                output.write(chunk)
    except Exception:
        path.unlink(missing_ok=True)
        raise

    return {
        "original_name": name or f"file{extension}",
        "stored_name": stored_name,
        "content_type": content_type,
        "size_bytes": size,
    }


def stored_file_path(stored_name: str) -> Path:
    if not STORED_NAME_PATTERN.fullmatch(stored_name):
        raise HTTPException(404, "File is missing on the server")
    path = upload_dir() / stored_name
    if not path.is_file():
        raise HTTPException(404, "File is missing on the server")
    return path
