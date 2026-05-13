"""Small shared helpers for JSON APIs and resume payloads."""
import json
import re

def coerce_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def safe_resume_payload(payload: dict) -> dict:
    return {
        "name": payload.get("name", "") or "",
        "email": payload.get("email", "") or "",
        "phone": payload.get("phone", "") or "",
        "linkedin": payload.get("linkedin", "") or "",
        "objective": payload.get("objective", "") or "",
        "skills": coerce_list(payload.get("skills")),
        "experience": coerce_list(payload.get("experience")),
        "education": coerce_list(payload.get("education")),
    }


def truncate_text(value, limit: int = 700) -> str:
    text = str(value or "").strip()
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "..."


def strip_code_fences(text: str) -> str:
    cleaned = str(text or "").strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def extract_json_object(text: str) -> dict:
    cleaned = strip_code_fences(text)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("AI response did not contain a JSON object.")
    return json.loads(cleaned[start : end + 1])


def safe_int(value, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        try:
            return int(float(value))
        except Exception:
            return default


def average(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)

def safe_str(value, default: str = '') -> str:
    if value is None:
        return default
    return str(value).strip() or default
