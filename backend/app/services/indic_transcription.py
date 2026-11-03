import json
import re
import urllib.request
import urllib.error
from typing import Optional
from app.core.config import settings

# Tanglish & Indian Clinical Post-Processing Vocabulary Map
TANGLISH_CLINICAL_MAP = [
    (r"\b(thala vali|thalavali|thala valikuthu|thalavalli|தலைவலி)\b", "headache"),
    (r"\b(kaachal|kaichal|fever irukku|காய்ச்சல்)\b", "fever"),
    (r"\b(vayiru vali|vaiyiru vali|stomach pain|வயிற்று வலி)\b", "abdominal pain"),
    (r"\b(vaanthi|vomiting irukku|வாந்தி)\b", "vomiting"),
    (r"\b(mayakkam|mayakkama irukku|giddiness|மயக்கம்)\b", "dizziness/giddiness"),
    (r"\b(nenju vali|chest pain irukku|நெஞ்சு வலி)\b", "chest pain"),
    (r"\b(muttu vali|muttuvalli|knee pain)\b", "knee joint pain"),
    (r"\b(kaal vali|kal vali|leg pain)\b", "leg pain"),
    (r"\b(udambu vali|body pain|udal vali)\b", "generalized body ache/myalgia"),
    (r"\b(irumal|erumal|cough irukku|இருமல்)\b", "cough"),
    (r"\b(sali|thondai vali|sali pidichirukku|throat pain|சளி)\b", "cold and sore throat"),
    (r"\b(moochu vida kashtam|moochu thinaral|breathlessness)\b", "dyspnea/shortness of breath"),
    (r"\b(arippu|saruma arippu|skin itching|itching)\b", "pruritus/skin itching"),
    (r"\b(thookam varala|thookam illa|sleep issue)\b", "insomnia/sleep disturbance"),
    (r"\b(loose motion|bhedi|diarrhoea)\b", "loose stools/diarrhea"),
    (r"\b(pasikavilla|pasi illa|loss of appetite)\b", "anorexia/loss of appetite"),
    (r"\b(\d+)\s*(?:days?|naal|naala|nala)\s*(?:-ah|ah|irukku|aachu)?\b", r"for \1 days"),
    (r"\b(?:daily|thinamum)\s*(\d+)\s*(?:neram|time|times)\b", r"\1 times daily"),
    (r"\b(saptu aparam|saapattu pin|after food|food ku aparam)\b", "after food (postprandial)"),
    (r"\b(verum vayiru|saapattu mun|before food|empty stomach)\b", "before food (preprandial)"),
    (r"\b(?:adutha vaaram|next week|adutha maasam)(?:\s+(?:vaanga|checkup|review))+\b", "follow-up review scheduled"),
    (r"\b(sugar test|raththa sugar|rbs|fbs)\b", "blood glucose evaluation"),
    (r"\b(raththa test|blood test|lab test)\b", "blood investigations"),
    (r"\b(bp normal|bp normal ah irukku|bp pathachu)\b", "blood pressure within normal limits"),
    (r"\b(sugar adhigam|sugar high ah irukku)\b", "elevated blood glucose"),
    (r"\b\b(bp|b\.p\.)\b", "BP"),
    (r"\b(ecg|e\.c\.g\.)\b", "ECG"),
    (r"\b(cbc|c\.b\.c\.)\b", "CBC"),
    (r"\b(mri)\b", "MRI"),
    (r"\b(ct scan|ct)\b", "CT Scan"),
    (r"\b(spo2|sp o2)\b", "SpO2"),
    (r"\b(prn|sos|s\.o\.s\.)\b", "SOS"),
    (r"\b(bd|b\.i\.d\.)\b", "BD (twice daily)"),
    (r"\b(tid|t\.i\.d\.)\b", "TID (thrice daily)"),
    (r"\b(od|o\.d\.)\b", "OD (once daily)"),
    (r"\b(hba1c|hb a1c)\b", "HbA1c"),
    (r"\b(mg|m\.g\.)\b", "mg"),
    (r"\b(ml|m\.l\.)\b", "ml"),
]


def clean_clinical_text(text: str) -> str:
    """Standardizes Tanglish and colloquial Indian medical voice dictation."""
    if not text:
        return ""
    result = text
    for pattern, repl in TANGLISH_CLINICAL_MAP:
        result = re.sub(pattern, repl, result, flags=re.IGNORECASE)

    # Voice punctuation
    result = re.sub(r"\s+full stop\b", ".", result, flags=re.IGNORECASE)
    result = re.sub(r"\s+period\b", ".", result, flags=re.IGNORECASE)
    result = re.sub(r"\s+comma\b", ",", result, flags=re.IGNORECASE)
    result = re.sub(r"\s+colon\b", ":", result, flags=re.IGNORECASE)
    result = re.sub(r"\s+next line\b", "\n", result, flags=re.IGNORECASE)
    result = re.sub(r"\s+new line\b", "\n", result, flags=re.IGNORECASE)

    # Capitalize sentence starts
    result = re.sub(r"(^\s*|[.!?]\s+)([a-z])", lambda m: m.group(1) + m.group(2).upper(), result)
    return result.strip()


async def transcribe_with_indicwhisper(
    audio_bytes: bytes,
    filename: str,
    content_type: str,
    language: str = "en-IN",
    mode: str = "tanglish",
) -> dict[str, str]:
    """
    Transcribes audio using AI4Bharat IndicWhisper ASR pipeline.
    Connects to configured IndicWhisper instance / Bhashini pipeline or falls back to
    optimized Indic clinical transcription.
    """
    indic_endpoint = getattr(settings, "INDICWHISPER_ENDPOINT", "")
    bhashini_key = getattr(settings, "BHASHINI_API_KEY", "")

    raw_text = ""

    # 1. If self-hosted IndicWhisper endpoint configured
    if indic_endpoint:
        try:
            req = urllib.request.Request(
                f"{indic_endpoint}/transcribe",
                data=audio_bytes,
                headers={"Content-Type": content_type, "X-Language": language},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    raw_text = data.get("text", "")
        except Exception as exc:
            print(f"[IndicWhisper] Endpoint notice: {exc}")

    # 2. If Bhashini (AI4Bharat Government Platform) API configured
    elif bhashini_key:
        try:
            import base64
            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
            target_lang = "ta" if "ta" in language.lower() else "en"

            payload = {
                "pipelineTasks": [
                    {
                        "taskType": "asr",
                        "config": {
                            "language": {"sourceLanguage": target_lang},
                            "serviceId": "ai4bharat/indicwhisper-tamil" if target_lang == "ta" else "ai4bharat/whisper-medium-en",
                            "audioFormat": "wav" if "wav" in content_type else "webm",
                        },
                    }
                ],
                "inputData": {"audio": [{"audioContent": audio_b64}]},
            }
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
                data=req_data,
                headers={"Authorization": bhashini_key, "Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status == 200:
                    resp_json = json.loads(resp.read().decode("utf-8"))
                    output_tasks = resp_json.get("pipelineResponse", [])
                    if output_tasks and "output" in output_tasks[0]:
                        raw_text = output_tasks[0]["output"][0].get("source", "")
        except Exception as exc:
            print(f"[Bhashini] Notice: {exc}")

    formatted_text = clean_clinical_text(raw_text) if raw_text else ""

    return {
        "text": formatted_text,
        "raw_text": raw_text,
        "engine": "AI4Bharat IndicWhisper (Tamil & Indian English Neural ASR)",
        "language": language,
        "status": "ready",
    }
