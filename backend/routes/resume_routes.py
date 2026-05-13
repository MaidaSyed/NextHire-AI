"""Resume preview, upload parsing, AI text helpers, PDF download."""

import logging
import os
import tempfile

from flask import Blueprint, Response, jsonify, request, send_file

from http_utils import json_error
from services.ai_service import gemini_generate_text
from services.document_extract import extract_text_from_docx, extract_text_from_pdf
from services.resume_render import html_to_pdf_bytes, render_resume_html, template_exists
from services.text_utils import safe_resume_payload

logger = logging.getLogger(__name__)

resume_bp = Blueprint("resume", __name__)


@resume_bp.route("/api/render-resume-preview", methods=["POST"])
def render_resume_preview():
    try:
        payload = request.get_json(silent=True) or {}
        template_id = (payload.get("template_id") or payload.get("template") or "").strip()
        data = payload.get("data") if isinstance(payload.get("data"), dict) else payload

        if not template_id:
            return json_error("Missing template_id.", 400)
        if not template_exists(template_id):
            return json_error(f"Template not found: {template_id}", 404)

        resume_data = safe_resume_payload(data if isinstance(data, dict) else {})
        html = render_resume_html(template_id, resume_data)
        return Response(html, mimetype="text/html; charset=utf-8")
    except Exception as exc:
        logger.error(f"Resume preview error: {str(exc)}")
        return json_error(str(exc), 500)


@resume_bp.route("/api/upload-resume", methods=["POST"])
def upload_resume():
    try:
        logger.info("Resume upload request received")
        if "resume" not in request.files:
            return json_error('No file part named "resume" provided.', 400)

        resume_file = request.files.get("resume")
        if not resume_file or not resume_file.filename:
            return json_error("No resume file uploaded.", 400)

        filename = resume_file.filename or "resume"
        content = resume_file.read()
        if not content:
            return json_error("Uploaded file is empty.", 400)

        lower = filename.lower()
        if lower.endswith(".pdf"):
            parsed_text = extract_text_from_pdf(content)
            source = "pdf"
        elif lower.endswith(".docx"):
            parsed_text = extract_text_from_docx(content)
            source = "docx"
        else:
            return json_error("Unsupported file type. Accepted: PDF, DOCX", 400)

        preview = (parsed_text or "")[:10000]
        logger.info(f"Parsed resume ({source}): {len(preview)} chars")
        return jsonify({"filename": filename, "parsed_text": preview, "source": source})
    except Exception as exc:
        logger.error(f"Resume upload error: {str(exc)}")
        return json_error(str(exc), 500)


@resume_bp.route("/api/generate-summary", methods=["POST"])
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

        summary = gemini_generate_text(prompt)
        logger.info("Summary generated successfully")
        return jsonify({"summary": summary})
    except Exception as exc:
        logger.error(f"Summary generation error: {str(exc)}")
        return json_error(str(exc), 500)


@resume_bp.route("/api/improve-text", methods=["POST"])
def improve_text():
    try:
        logger.info("Text improvement request received")
        payload = request.get_json(silent=True) or {}
        raw_text = (payload.get("text") or "").strip()
        if not raw_text:
            logger.warning("Text improvement: empty text provided")
            return json_error("Missing text.", 400)

        prompt = (
            "You are an expert resume writer. Rewrite the following experience description into "
            "professional, ATS-friendly bullet points. Use action verbs, include impact/metrics when possible, "
            "and keep it concise.\n\n"
            "Return 3-6 bullets, each on a new line, starting with '- '. Output only the bullets.\n\n"
            f"TEXT:\n{raw_text}"
        )

        improved = gemini_generate_text(prompt)

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
        return json_error(str(exc), 500)


@resume_bp.route("/api/generate-resume", methods=["POST"])
def generate_resume():
    try:
        logger.info("Resume generation request received")
        payload = request.get_json(silent=True) or {}
        template_id = (payload.get("template_id") or "").strip() or (payload.get("template") or "").strip()
        data = payload.get("data") if isinstance(payload.get("data"), dict) else payload

        if not template_id:
            logger.warning("Resume generation: missing template_id")
            return json_error("Missing template_id.", 400)
        if not template_exists(template_id):
            logger.warning(f"Resume generation: template not found: {template_id}")
            return json_error(f"Template not found: {template_id}", 404)

        resume_data = safe_resume_payload(data if isinstance(data, dict) else {})

        html = render_resume_html(template_id, resume_data)
        pdf_bytes = html_to_pdf_bytes(html)

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
        return json_error(str(exc), 500)
