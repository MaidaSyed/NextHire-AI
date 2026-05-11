import io
import json
import logging
import os
import pathlib
import re
import string
import tempfile
import urllib.error
import urllib.request

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from jinja2 import Environment, FileSystemLoader, select_autoescape

from config import get_setting

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    from dotenv import load_dotenv

    load_dotenv(dotenv_path=pathlib.Path(__file__).resolve().parent / ".env")
except Exception:
    pass

app = Flask(__name__)

# Enable CORS for production deployment
CORS(app, resources={
    r"/api/*": {
        "origins": os.environ.get("CORS_ORIGINS", "*").split(","),
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"],
    }
})

# Production settings
app.config['JSON_SORT_KEYS'] = False
app.config['ENV'] = os.environ.get('FLASK_ENV', 'production')


_BASE_STOPWORDS = {
    "a",
    "an",
    "the",
    "and",
    "or",
    "of",
    "to",
    "in",
    "for",
    "with",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "on",
    "at",
    "by",
    "from",
    "as",
    "that",
    "this",
    "these",
    "those",
    "it",
    "its",
    "i",
    "we",
    "you",
    "they",
    "them",
    "our",
    "your",
    "their",
    "he",
    "she",
    "his",
    "her",
    "not",
    "but",
    "if",
    "then",
    "so",
    "such",
    "can",
    "could",
    "should",
    "would",
    "will",
    "may",
    "might",
    "must",
    "do",
    "does",
    "did",
    "done",
    "have",
    "has",
    "had",
    "having",
    "about",
    "into",
    "over",
    "under",
    "between",
    "while",
    "during",
    "before",
    "after",
    "up",
    "down",
    "out",
    "off",
    "again",
    "further",
    "here",
    "there",
    "when",
    "where",
    "why",
    "how",
    "all",
    "any",
    "both",
    "each",
    "few",
    "more",
    "most",
    "other",
    "some",
    "no",
    "nor",
    "only",
    "own",
    "same",
    "than",
    "too",
    "very",
}

_SYNONYM_TO_CANONICAL = {
    "teamwork": "collaboration",
    "collaboration": "collaboration",
    "collaborate": "collaboration",
    "api": "rest api",
    "apis": "rest api",
    "rest api": "rest api",
    "rest apis": "rest api",
    "data analysis": "analytics",
    "analytics": "analytics",
}

_PHRASE_SKILLS = {
    "data analysis",
    "machine learning",
    "deep learning",
    "natural language",
    "nlp",
    "computer vision",
    "rest api",
    "unit testing",
    "test automation",
    "cloud computing",
    "microservices",
    "project management",
}

_COMMON_SKILLS = {
    "python",
    "java",
    "javascript",
    "typescript",
    "react",
    "node",
    "flask",
    "django",
    "fastapi",
    "sql",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "docker",
    "kubernetes",
    "aws",
    "azure",
    "gcp",
    "git",
    "linux",
    "html",
    "css",
    "rest api",
    "microservices",
    "unit testing",
    "ci",
    "cd",
    "devops",
}


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        from PyPDF2 import PdfReader
    except Exception:
        raise RuntimeError("PyPDF2 not installed. Run: python -m pip install PyPDF2")

    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        parts: list[str] = []
        for page in reader.pages:
            page_text = page.extract_text() or ""
            parts.append(page_text)
        return "\n".join(parts).strip()
    except Exception as exc:
        raise RuntimeError(f"Failed to read PDF: {exc}")


def _get_stopwords() -> set[str]:
    try:
        import nltk
        from nltk.corpus import stopwords

        try:
            words = set(stopwords.words("english"))
        except Exception:
            nltk.download("stopwords", quiet=True)
            words = set(stopwords.words("english"))
        return _BASE_STOPWORDS | words
    except Exception:
        return set(_BASE_STOPWORDS)


def _tokenize(text: str, stopwords_set: set[str]) -> list[str]:
    if not text:
        return []

    lowered = str(text).lower()
    cleaned = re.sub(r"[^a-z\s]+", " ", lowered)
    cleaned = cleaned.translate(str.maketrans("", "", string.punctuation))
    tokens = cleaned.split()

    result: list[str] = []
    for t in tokens:
        if t in stopwords_set:
            continue
        if len(t) < 2:
            continue
        result.append(t)
    return result


def _normalize_term(term: str) -> str:
    t = term.strip().lower()
    if t in _SYNONYM_TO_CANONICAL:
        return _SYNONYM_TO_CANONICAL[t]
    if t.endswith("s") and len(t) > 3:
        singular = t[:-1]
        if singular in _SYNONYM_TO_CANONICAL:
            return _SYNONYM_TO_CANONICAL[singular]
    return t


def _extract_keywords(tokens: list[str]) -> set[str]:
    if not tokens:
        return set()

    out: set[str] = set()
    out.update(_normalize_term(t) for t in tokens)

    for i in range(len(tokens) - 1):
        phrase = f"{tokens[i]} {tokens[i+1]}"
        normalized = _normalize_term(phrase)
        if normalized in _PHRASE_SKILLS:
            out.add(normalized)

    return out


def _cosine_similarity_fallback(a_keywords: set[str], b_keywords: set[str]) -> float:
    if not a_keywords or not b_keywords:
        return 0.0
    intersection = len(a_keywords & b_keywords)
    denom = (len(a_keywords) * len(b_keywords)) ** 0.5
    return intersection / denom if denom else 0.0


def _semantic_similarity_score(resume_text: str, jd_text: str) -> float:
    if not resume_text or not jd_text:
        return 0.0

    try:
        from sentence_transformers import SentenceTransformer, util

        if not hasattr(_semantic_similarity_score, "_model"):
            _semantic_similarity_score._model = SentenceTransformer("all-MiniLM-L6-v2")
        model = _semantic_similarity_score._model

        emb1 = model.encode(resume_text, convert_to_tensor=True, normalize_embeddings=True)
        emb2 = model.encode(jd_text, convert_to_tensor=True, normalize_embeddings=True)
        sim = util.cos_sim(emb1, emb2).item()
        return max(0.0, min(1.0, float(sim))) * 100
    except Exception:
        pass

    # Fallback to keyword-based similarity if sentence-transformers fails
    stopwords_set = _get_stopwords()
    resume_keywords = _extract_keywords(_tokenize(resume_text, stopwords_set))
    jd_keywords = _extract_keywords(_tokenize(jd_text, stopwords_set))
    return max(0.0, min(1.0, _cosine_similarity_fallback(resume_keywords, jd_keywords))) * 100


def calculate_advanced_ats(resume_text: str, jd_text: str, resume_source: str, jd_source: str) -> dict:
    stopwords_set = _get_stopwords()

    resume_tokens = _tokenize(resume_text, stopwords_set)
    jd_tokens = _tokenize(jd_text, stopwords_set)

    resume_keywords = _extract_keywords(resume_tokens)
    jd_keywords = _extract_keywords(jd_tokens)

    total_jd_keywords = len(jd_keywords)
    total_resume_keywords = len(resume_keywords)

    matched_keywords = sorted(jd_keywords & resume_keywords)
    missing_keywords = sorted(jd_keywords - resume_keywords)

    keyword_score = 0.0
    if total_jd_keywords:
        keyword_score = (len(matched_keywords) / total_jd_keywords) * 100

    semantic_score = _semantic_similarity_score(resume_text, jd_text)

    jd_skills = set()
    for k in jd_keywords:
        if k in _COMMON_SKILLS or k in _PHRASE_SKILLS:
            jd_skills.add(k)

    resume_skills = set()
    for k in resume_keywords:
        if k in _COMMON_SKILLS or k in _PHRASE_SKILLS:
            resume_skills.add(k)

    important_skills_detected = sorted(resume_skills & jd_skills) if jd_skills else sorted(resume_skills)

    skill_score = 0.0
    if jd_skills:
        skill_score = (len(resume_skills & jd_skills) / len(jd_skills)) * 100
    else:
        skill_score = keyword_score

    ats_score = (0.4 * keyword_score) + (0.4 * semantic_score) + (0.2 * skill_score)

    suggestions: list[str] = []
    if len(resume_tokens) < max(150, len(jd_tokens) // 2):
        suggestions.append("Improve experience section")
    if missing_keywords:
        suggestions.append(f"Add missing skills: {', '.join(missing_keywords[:15])}")
    if semantic_score < 55:
        suggestions.append("Improve project descriptions with impact metrics")
    suggestions.append("Use more action verbs")

    seen = set()
    deduped_suggestions: list[str] = []
    for s in suggestions:
        if s not in seen:
            deduped_suggestions.append(s)
            seen.add(s)

    return {
        "ats_score": round(float(ats_score), 2),
        "keyword_score": round(float(keyword_score), 2),
        "semantic_score": round(float(semantic_score), 2),
        "skill_score": round(float(skill_score), 2),
        "matched_keywords": matched_keywords,
        "missing_keywords": missing_keywords,
        "important_skills_detected": important_skills_detected,
        "resume_source": resume_source,
        "jd_source": jd_source,
        "suggestions": deduped_suggestions,
    }


def _error(message: str, status_code: int = 400):
    return jsonify({"error": message}), status_code


def _backend_templates_root() -> pathlib.Path:
    return pathlib.Path(__file__).resolve().parent / "templates"


def _jinja_env() -> Environment:
    if not hasattr(_jinja_env, "_env"):
        _jinja_env._env = Environment(
            loader=FileSystemLoader(str(_backend_templates_root())),
            autoescape=select_autoescape(["html", "xml"]),
        )
    return _jinja_env._env


def _template_exists(template_id: str) -> bool:
    t_root = _backend_templates_root() / template_id
    return (t_root / "index.html").is_file() and (t_root / "style.css").is_file()


def _render_resume_html(template_id: str, data: dict) -> str:
    template = _jinja_env().get_template(f"{template_id}/index.html")
    rendered = template.render(**data)
    rendered = re.sub(
        r'<link[^>]+rel=["\']stylesheet["\'][^>]*>\s*',
        "",
        rendered,
        flags=re.IGNORECASE,
    )
    css_path = _backend_templates_root() / template_id / "style.css"
    css = css_path.read_text(encoding="utf-8")
    style_tag = f"<style>\n{css}\n</style>\n"
    if "</head>" in rendered:
        return rendered.replace("</head>", style_tag + "</head>", 1)
    return style_tag + rendered


def _html_to_pdf_bytes(html: str) -> bytes:
    weasy_err = None
    try:
        from weasyprint import HTML

        return HTML(string=html).write_pdf()
    except Exception as exc:
        weasy_err = f"weasyprint failed: {exc}"

    pdfkit_err = None
    try:
        import pdfkit

        return pdfkit.from_string(
            html,
            False,
            options={
                "enable-local-file-access": None,
                "quiet": None,
            },
        )
    except Exception as exc:
        pdfkit_err = f"pdfkit failed: {exc}"

    raise RuntimeError(
        "PDF generation is not available. "
        f"{weasy_err} {pdfkit_err} "
        "Install WeasyPrint with system dependencies, or install pdfkit + wkhtmltopdf."
    )


def _gemini_generate_text(prompt: str) -> str:
    api_key = get_setting("NEXTHIRE_AI_API_KEY") or get_setting("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("AI API key not configured. Set NEXTHIRE_AI_API_KEY.")

    model = get_setting("NEXTHIRE_AI_MODEL", "gemini-2.0-flash")
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
        raise RuntimeError(f"AI request failed: {raw}")

    data = json.loads(raw or "{}")
    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError("AI returned no candidates.")

    parts = (((candidates[0] or {}).get("content") or {}).get("parts") or [])
    text = "".join((p.get("text") or "") for p in parts if isinstance(p, dict)).strip()
    if not text:
        raise RuntimeError("AI returned empty text.")
    return text


def _coerce_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _safe_resume_payload(payload: dict) -> dict:
    return {
        "name": payload.get("name", "") or "",
        "email": payload.get("email", "") or "",
        "phone": payload.get("phone", "") or "",
        "linkedin": payload.get("linkedin", "") or "",
        "objective": payload.get("objective", "") or "",
        "skills": _coerce_list(payload.get("skills")),
        "experience": _coerce_list(payload.get("experience")),
        "education": _coerce_list(payload.get("education")),
    }


@app.route("/api/test", methods=["GET"])
def test():
    logger.info("Health check endpoint called")
    return jsonify({"message": "Backend working!"})


@app.route("/api/ats-score", methods=["POST"])
def ats_score():
    try:
        logger.info("ATS score request received")
        resume_text = ""
        jd_text = ""
        resume_source = "text"
        jd_source = "text"
        job_title = ""
        industry = ""

        if request.is_json:
            payload = request.get_json(silent=True) or {}
            resume_text = payload.get("resume_text", "") or ""
            jd_text = payload.get("jd_text", "") or payload.get("job_description", "") or ""
            job_title = payload.get("job_title", "") or ""
            industry = payload.get("industry", "") or ""
        else:
            form = request.form or {}
            resume_text = form.get("resume_text", "") or ""
            jd_text = form.get("jd_text", "") or ""

            resume_file = request.files.get("resume_pdf")
            jd_file = request.files.get("jd_pdf")

            if resume_file and resume_file.filename:
                resume_bytes = resume_file.read()
                if not resume_bytes:
                    logger.warning("Empty resume PDF received")
                    return _error("Resume PDF is empty.")
                resume_text = _extract_text_from_pdf(resume_bytes)
                resume_source = "pdf"

            if jd_file and jd_file.filename:
                jd_bytes = jd_file.read()
                if not jd_bytes:
                    logger.warning("Empty JD PDF received")
                    return _error("Job description PDF is empty.")
                jd_text = _extract_text_from_pdf(jd_bytes)
                jd_source = "pdf"

            if jd_text and jd_source == "text":
                jd_source = "text"

        # Accept job title and industry from form fields
        try:
            job_title = job_title or (request.form.get("job_title") or "")
            industry = industry or (request.form.get("industry") or "")
        except Exception:
            pass

        if not str(resume_text).strip():
            logger.warning("ATS score request missing resume")
            return _error("No resume provided. Send resume_text or resume_pdf.")
        if not str(jd_text).strip():
            logger.warning("ATS score request missing job description")
            return _error("No job description provided. Send jd_text / job_description or jd_pdf.")

        # Compute a local baseline result
        local_result = calculate_advanced_ats(resume_text, jd_text, resume_source, jd_source)

        # Attempt to call Gemini to get a JSON-formatted ATS scoring breakdown.
        # If the AI call fails or returns invalid JSON, fall back to local result.
        try:
            prompt = (
                "You are an expert Applicant Tracking System (ATS) scoring engine. "
                "Given the JOB_TITLE, INDUSTRY, JOB_DESCRIPTION and RESUME_TEXT, "
                "return a single JSON object (no extra text) with the following keys:\n"
                "- score: integer 0-100 representing the ATS match score\n"
                "- matched_keywords: array of strings (keywords found in resume)\n"
                "- missing_keywords: array of strings (keywords present in JD but missing in resume)\n"
                "- formatting_issues: array of strings describing likely formatting problems (e.g. 'two-column layout', 'images', 'tables', 'unreadable fonts')\n\n"
                f"JOB_TITLE: {job_title}\n"
                f"INDUSTRY: {industry}\n"
                "JOB_DESCRIPTION:\n" + jd_text + "\n\n"
                "RESUME_TEXT:\n" + resume_text + "\n\n"
                "When listing keywords, prefer single-word or short phrase skills like 'react', 'node', 'project management'. "
                "Output only valid JSON."
            )

            gemini_raw = _gemini_generate_text(prompt)
            gemini_raw = gemini_raw.strip()
            # Try to extract JSON even if the model adds backticks or triple quotes
            json_start = gemini_raw.find('{')
            json_text = gemini_raw if json_start == 0 else gemini_raw[json_start:]
            parsed = json.loads(json_text)

            # Build final result merging local and gemini outputs
            final = dict(local_result)
            if isinstance(parsed.get('score'), (int, float)):
                final['ats_score'] = round(float(parsed.get('score')), 2)
            if isinstance(parsed.get('matched_keywords'), list):
                final['matched_keywords'] = [str(x) for x in parsed.get('matched_keywords')]
            if isinstance(parsed.get('missing_keywords'), list):
                final['missing_keywords'] = [str(x) for x in parsed.get('missing_keywords')]
            # formatting_issues is model-provided; include as-is if present
            if isinstance(parsed.get('formatting_issues'), list):
                final['formatting_issues'] = [str(x) for x in parsed.get('formatting_issues')]

            # Include a short preview of the resume text for frontend display
            try:
                final['resume_text_preview'] = (resume_text or "")[:4000]
            except Exception:
                final['resume_text_preview'] = ""
            logger.info(f"ATS score (Gemini): {final.get('ats_score')}")
            return jsonify(final)
        except Exception as exc:
            logger.warning(f"Gemini ATS fallback: {exc}")

        try:
            local_result['resume_text_preview'] = (resume_text or "")[:4000]
        except Exception:
            local_result['resume_text_preview'] = ""
        logger.info(f"ATS score calculated (local): {local_result.get('ats_score')}")
        return jsonify(local_result)
    except Exception as exc:
        logger.error(f"ATS score error: {str(exc)}")
        return _error(str(exc), 500)


@app.route("/api/generate-summary", methods=["POST"])
def generate_summary():
    try:
        logger.info("Summary generation request received")
        payload = request.get_json(silent=True) or {}
        skills = payload.get("skills", [])
        experience = payload.get("experience", [])

        skills_text = ", ".join(
            [
                f"{(s or {}).get('name', '')}".strip()
                for s in skills
                if isinstance(s, dict) and (s or {}).get("name")
            ]
        )
        exp_lines = []
        for e in experience if isinstance(experience, list) else []:
            if not isinstance(e, dict):
                continue
            title = (e.get("title") or "").strip()
            company = (e.get("company") or "").strip()
            desc = (e.get("description") or "").strip()
            line = " - ".join([p for p in [title, company] if p])
            if desc:
                line = f"{line}: {desc}" if line else desc
            if line:
                exp_lines.append(line)

        prompt = (
            "You are an expert resume writer. Write a concise professional summary (2-4 lines) "
            "for a resume. Keep it ATS-friendly, quantified where possible, and avoid emojis.\n\n"
            f"Skills: {skills_text}\n"
            "Experience:\n"
            + ("\n".join(f"- {x}" for x in exp_lines) if exp_lines else "- (none provided)")
            + "\n\nOutput only the summary text."
        )

        summary = _gemini_generate_text(prompt)
        logger.info("Summary generated successfully")
        return jsonify({"summary": summary})
    except Exception as exc:
        logger.error(f"Summary generation error: {str(exc)}")
        return _error(str(exc), 500)


@app.route("/api/improve-text", methods=["POST"])
def improve_text():
    try:
        logger.info("Text improvement request received")
        payload = request.get_json(silent=True) or {}
        raw_text = (payload.get("text") or "").strip()
        if not raw_text:
            logger.warning("Text improvement: empty text provided")
            return _error("Missing text.", 400)

        prompt = (
            "You are an expert resume writer. Rewrite the following experience description into "
            "professional, ATS-friendly bullet points. Use action verbs, include impact/metrics when possible, "
            "and keep it concise.\n\n"
            "Return 3-6 bullets, each on a new line, starting with '- '. Output only the bullets.\n\n"
            f"TEXT:\n{raw_text}"
        )

        improved = _gemini_generate_text(prompt)
        
        lines = [ln.strip() for ln in improved.splitlines() if ln.strip()]
        bullets = []
        for ln in lines:
            cleaned = ln.lstrip("•*- ").strip()
            if cleaned:
                bullets.append(cleaned)

        logger.info(f"Text improved: {len(bullets)} bullets generated")
        return jsonify({"improved_text": improved.strip(), "bullets": bullets})
    except Exception as exc:
        logger.error(f"Text improvement error: {str(exc)}")
        return _error(str(exc), 500)


@app.route("/api/generate-resume", methods=["POST"])
def generate_resume():
    try:
        logger.info("Resume generation request received")
        payload = request.get_json(silent=True) or {}
        template_id = (payload.get("template_id") or "").strip() or (payload.get("template") or "").strip()
        data = payload.get("data") if isinstance(payload.get("data"), dict) else payload

        if not template_id:
            logger.warning("Resume generation: missing template_id")
            return _error("Missing template_id.", 400)
        if not _template_exists(template_id):
            logger.warning(f"Resume generation: template not found: {template_id}")
            return _error(f"Template not found: {template_id}", 404)

        resume_data = _safe_resume_payload(data if isinstance(data, dict) else {})

        html = _render_resume_html(template_id, resume_data)
        pdf_bytes = _html_to_pdf_bytes(html)
        
        filename = f"{(resume_data.get('name') or 'resume').strip().replace(' ', '_')}.pdf"
        logger.info(f"Resume generated successfully: {filename}")
        
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        try:
            tmp.write(pdf_bytes)
            tmp.flush()
            tmp.close()
            return send_file(tmp.name, as_attachment=True, download_name=filename, mimetype="application/pdf")
        finally:
            try:
                os.unlink(tmp.name)
            except Exception:
                pass
    except Exception as exc:
        logger.error(f"Resume generation error: {str(exc)}")
        return _error(str(exc), 500)


@app.errorhandler(404)
def not_found(error):
    logger.warning(f"404 Error: {request.path}")
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 Error: {str(error)}")
    return jsonify({"error": "Internal server error"}), 500


if __name__ == "__main__":
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
