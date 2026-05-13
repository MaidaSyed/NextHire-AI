"""Gemini / Groq text generation."""
import json
import logging
import urllib.error
import urllib.request

from config import get_setting

logger = logging.getLogger(__name__)

def gemini_generate_text(prompt: str) -> str:
    # Try Gemini / Google Generative Language first
    api_key = get_setting("NEXTHIRE_AI_API_KEY") or get_setting("GOOGLE_API_KEY")
    model = get_setting("NEXTHIRE_AI_MODEL", "gemini-1.5-flash")

    def _call_gemini():
        if not api_key:
            raise RuntimeError("Gemini API key not configured. Set NEXTHIRE_AI_API_KEY or GOOGLE_API_KEY.")
        endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            f"?key={api_key}"
        )
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.4},
        }

        req = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=40) as resp:
                raw = resp.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace") if exc.fp else str(exc)
            raise RuntimeError(f"Gemini AI request failed: {raw}")

        data = json.loads(raw or "{}")
        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError("Gemini AI returned no candidates.")

        parts = (((candidates[0] or {}).get("content") or {}).get("parts") or [])
        text = "".join((p.get("text") or "") for p in parts if isinstance(p, dict)).strip()
        if not text:
            raise RuntimeError("Gemini AI returned empty text.")
        return text

    def _groq_generate_text(prompt: str) -> str:
        groq_key = get_setting("GROQ_API_KEY")
        if not groq_key:
            raise RuntimeError("Groq API key not configured. Set GROQ_API_KEY.")

        groq_model = get_setting("GROQ_MODEL", "llama-3.3-70b-versatile")
        endpoint = "https://api.groq.com/openai/v1/chat/completions"
        payload = {
            "model": groq_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.4,
        }

        req = urllib.request.Request(
            endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {groq_key}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=40) as resp:
                raw = resp.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace") if exc.fp else str(exc)
            raise RuntimeError(f"Groq AI request failed: {raw}")

        data = json.loads(raw or "{}")
        choices = data.get("choices") or []
        if choices:
            first = choices[0]
            # Chat-completions style
            msg = first.get("message") or first.get("delta") or {}
            content = ""
            if isinstance(msg, dict):
                # Some providers nest content differently
                content = msg.get("content") or msg.get("text") or ""
            if not content:
                # Try common fallbacks
                content = first.get("text") or first.get("message", {}).get("content") or ""
            text = (content or "").strip()
            if text:
                return text

        # Fallback: try top-level 'text' or 'choices[0].text'
        text_fallback = (data.get("text") or (choices[0].get("text") if choices else None) or "").strip()
        if text_fallback:
            return text_fallback

        raise RuntimeError("Groq AI returned no usable text.")

    # First try Gemini; on failure, attempt Groq if configured
    try:
        return _call_gemini()
    except Exception as gem_exc:
        logger.warning(f"Gemini call failed: {gem_exc}. Attempting Groq fallback.")
        try:
            return _groq_generate_text(prompt)
        except Exception as groq_exc:
            logger.error(f"Groq fallback failed: {groq_exc}")
            # Raise combined error for visibility
            raise RuntimeError(f"AI request failed. Gemini error: {gem_exc}; Groq error: {groq_exc}")