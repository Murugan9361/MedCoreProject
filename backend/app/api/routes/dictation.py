from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from app.api.deps import get_current_user
from app.models.user import User
from app.services.indic_transcription import clean_clinical_text, transcribe_with_indicwhisper

router = APIRouter(prefix="/dictation", tags=["dictation"])


@router.get("/info")
def get_dictation_info(current: User = Depends(get_current_user)):
    """Returns AI4Bharat IndicWhisper configuration and supported dialects."""
    return {
        "engine": "AI4Bharat IndicWhisper",
        "version": "IndicASR-v2 / Whisper-Tamil",
        "institution": "AI4Bharat, IIT Madras",
        "supported_dialects": [
            {"code": "en-IN", "name": "Indian English", "description": "Tuned for Indian English cadence and Indian drug brands"},
            {"code": "tanglish", "name": "Tanglish (Tamil + English)", "description": "Mixed code-switched clinical speech with medical normalizer"},
            {"code": "ta-IN", "name": "Tamil (தமிழ்)", "description": "Native Tamil speech recognition"},
        ],
        "features": [
            "Medical abbreviation expansion (BP, ECG, CBC, SOS, BD, TID, OD)",
            "Tanglish clinical symptom mapping to ICD-10 medical terminology",
            "Automatic voice punctuation (comma, full stop, next line)",
            "Browser independent (Works on Chrome, Edge, Safari, Firefox, iOS, Android)",
        ],
    }


@router.post("/transcribe")
async def transcribe_audio(
    audio: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    language: str = Form("en-IN"),
    mode: str = Form("tanglish"),
    current: User = Depends(get_current_user),
):
    """
    Transcribes audio using AI4Bharat IndicWhisper speech-to-text pipeline.
    Also accepts raw audio chunks or transcribed text for instant clinical normalization.
    """
    # If client passed raw text for Tanglish-to-Clinical normalization
    if raw_text and not audio:
        formatted = clean_clinical_text(raw_text)
        return {
            "status": "success",
            "engine": "AI4Bharat IndicWhisper Clinical Normalizer",
            "language": language,
            "text": formatted,
            "raw_text": raw_text,
        }

    if not audio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either audio file or raw_text must be provided",
        )

    audio_bytes = await audio.read()
    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty",
        )

    res = await transcribe_with_indicwhisper(
        audio_bytes=audio_bytes,
        filename=audio.filename or "recording.webm",
        content_type=audio.content_type or "audio/webm",
        language=language,
        mode=mode,
    )

    # If backend raw_text is empty (meaning running without external GPU server connected),
    # return the structured payload indicating ready state.
    if not res["text"] and raw_text:
        res["text"] = clean_clinical_text(raw_text)
        res["raw_text"] = raw_text

    return {
        "status": "success",
        "engine": res["engine"],
        "language": res["language"],
        "text": res["text"],
        "raw_text": res["raw_text"],
        "size_bytes": len(audio_bytes),
    }


@router.post("/normalize")
def normalize_clinical_notes(
    text: str = Form(...),
    current: User = Depends(get_current_user),
):
    """Normalizes colloquial Tanglish speech into professional clinical English."""
    cleaned = clean_clinical_text(text)
    return {
        "status": "success",
        "engine": "AI4Bharat Clinical Post-Processor",
        "formatted_text": cleaned,
        "original_text": text,
    }

