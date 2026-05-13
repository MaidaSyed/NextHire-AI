"""ATS scoring: Gemini primary, local lexical/semantic fallback."""

import json
import logging

from flask import Blueprint, jsonify, request

from http_utils import json_error
from services.ai_service import gemini_generate_text
from services.ats_scoring import calculate_advanced_ats
from services.document_extract import extract_text_from_pdf

logger = logging.getLogger(__name__)

ats_bp = Blueprint("ats", __name__)


@ats_bp.route("/api/ats-score", methods=["POST"])
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
                    return json_error("Resume PDF is empty.")
                resume_text = extract_text_from_pdf(resume_bytes)
                resume_source = "pdf"

            if jd_file and jd_file.filename:
                jd_bytes = jd_file.read()
                if not jd_bytes:
                    logger.warning("Empty JD PDF received")
                    return json_error("Job description PDF is empty.")
                jd_text = extract_text_from_pdf(jd_bytes)
                jd_source = "pdf"

            if jd_text and jd_source == "text":
                jd_source = "text"

        try:
            job_title = job_title or (request.form.get("job_title") or "")
            industry = industry or (request.form.get("industry") or "")
        except Exception:
            pass

        if not str(resume_text).strip():
            logger.warning("ATS score request missing resume")
            return json_error("No resume provided. Send resume_text or resume_pdf.")
        if not str(jd_text).strip():
            logger.warning("ATS score request missing job description")
            return json_error("No job description provided. Send jd_text / job_description or jd_pdf.")

        try:
            prompt = (
                "You are an expert ATS (Applicant Tracking System) analyst. Analyze this resume against the job description "
                "using these proven methodologies:\n\n"
                "ANALYSIS FRAMEWORK:\n"
                "1. KEYWORD FREQUENCY & CONTEXTUAL MAPPING:\n"
                "   - Direct Skills Match: Exact matches for core requirements (HTML, CSS, JavaScript, etc.)\n"
                "   - Desired Skills Match: Plus/nice-to-have keywords (React, frameworks, etc.)\n"
                "   - Verb Alignment: Check for action verbs from JD (developing, maintaining, collaborating, etc.)\n"
                "   - Project Relevance: Does technical stack show exceeding competency for the role?\n\n"
                "2. ROLE ELIGIBILITY & HIERARCHY VERIFICATION:\n"
                "   - Educational Background: Does degree/major match requirements?\n"
                "   - Experience Level: Does career stage (intern, junior, mid-level) align with JD target?\n"
                "   - Graduation Timeline: Is timing appropriate (final semester, recent grad, etc.)?\n\n"
                "3. STRUCTURAL PARSABILITY:\n"
                "   - Section Headers: Are standard sections (Skills, Education, Experience, Projects) present?\n"
                "   - Contact Info: Email, phone, location clearly visible?\n"
                "   - Formatting: Professional layout, ATS-friendly formatting?\n\n"
                "4. TECHNICAL DEPTH ASSESSMENT:\n"
                "   - Technical Stack: Does it exceed minimum requirements?\n"
                "   - Project Complexity: Quality and relevance of projects listed?\n"
                "   - Skill Progression: Evidence of growth and learning?\n\n"
                f"JOB TITLE: {job_title}\n"
                f"INDUSTRY: {industry}\n\n"
                "JOB DESCRIPTION:\n---\n" + jd_text[:3000] + "\n---\n\n"
                "RESUME TEXT:\n---\n" + resume_text[:3000] + "\n---\n\n"
                "Return ONLY valid JSON with no extra text:\n"
                "{\n"
                '  "score": <0-100 integer - overall ATS match>,\n'
                '  "keyword_match_score": <0-100>,\n'
                '  "eligibility_score": <0-100>,\n'
                '  "parsability_score": <0-100>,\n'
                '  "technical_depth_score": <0-100>,\n'
                '  "matched_keywords": [<array of matched skills>],\n'
                '  "missing_keywords": [<array of missing but important skills>],\n'
                '  "formatting_issues": [<array of formatting concerns like \'two-column layout\', \'images detected\', \'long paragraphs\', etc.>],\n'
                '  "core_requirements_met": <true/false>,\n'
                '  "plus_skills_present": [<bonus skills that are present>],\n'
                '  "education_match": <brief assessment>,\n'
                '  "experience_fit": <brief assessment>,\n'
                '  "strengths": [<top 3 resume strengths>],\n'
                '  "gaps": [<top 3 areas to improve>],\n'
                '  "overall_assessment": <one sentence summary>\n'
                "}\n\n"
                "SCORING CALIBRATION:\n"
                "- Score 80-90: Strong match (core + plus skills, excellent project fit)\n"
                "- Score 90+: Excellent match (all requirements met, exceeds expectations)\n"
                "- Be generous with scores for good candidates, similar to how a human recruiter or ChatGPT/Gemini web would evaluate.\n"
                "- A score of 70-80 is 'Good', 80-90 is 'Great', 90+ is 'Outstanding'."
            )

            gemini_response = gemini_generate_text(prompt)
            logger.info(f"Gemini raw response: {gemini_response[:500]}")

            gemini_response = gemini_response.strip()
            json_start = gemini_response.find("{")
            json_end = gemini_response.rfind("}")

            if json_start >= 0 and json_end > json_start:
                json_text = gemini_response[json_start : json_end + 1]
                parsed = json.loads(json_text)

                result = {
                    "ats_score": round(float(parsed.get("score", 0)), 2),
                    "keyword_score": round(float(parsed.get("keyword_match_score", 0)), 2),
                    "semantic_score": round(float(parsed.get("technical_depth_score", 0)), 2),
                    "keyword_match_score": round(float(parsed.get("keyword_match_score", 0)), 2),
                    "eligibility_score": round(float(parsed.get("eligibility_score", 0)), 2),
                    "parsability_score": round(float(parsed.get("parsability_score", 0)), 2),
                    "technical_depth_score": round(float(parsed.get("technical_depth_score", 0)), 2),
                    "matched_keywords": [str(x).strip() for x in parsed.get("matched_keywords", []) if x],
                    "missing_keywords": [str(x).strip() for x in parsed.get("missing_keywords", []) if x],
                    "formatting_issues": [str(x).strip() for x in parsed.get("formatting_issues", []) if x],
                    "core_requirements_met": parsed.get("core_requirements_met", False),
                    "plus_skills_present": [str(x).strip() for x in parsed.get("plus_skills_present", []) if x],
                    "education_match": str(parsed.get("education_match", "")),
                    "experience_fit": str(parsed.get("experience_fit", "")),
                    "strengths": [str(x).strip() for x in parsed.get("strengths", []) if x],
                    "gaps": [str(x).strip() for x in parsed.get("gaps", []) if x],
                    "overall_assessment": str(parsed.get("overall_assessment", "")),
                    "resume_source": resume_source,
                    "jd_source": jd_source,
                    "analysis_method": "Gemini AI (Expert ATS Analysis)",
                }

                try:
                    result["resume_text_preview"] = (resume_text or "")[:2000]
                except Exception:
                    result["resume_text_preview"] = ""

                logger.info(f"ATS Score (Gemini): {result.get('ats_score')}")
                return jsonify(result)

        except json.JSONDecodeError as je:
            logger.warning(f"Gemini JSON parse error: {je}")
        except Exception as gemini_err:
            logger.warning(f"Gemini ATS analysis error: {gemini_err}")

        logger.info("Falling back to local ATS calculation")
        local_result = calculate_advanced_ats(resume_text, jd_text, resume_source, jd_source)

        try:
            local_result["resume_text_preview"] = (resume_text or "")[:2000]
        except Exception:
            local_result["resume_text_preview"] = ""

        local_result["analysis_method"] = "Local Analysis (Fallback)"
        logger.info(f"ATS Score (Local Fallback): {local_result.get('ats_score')}")
        return jsonify(local_result)
    except Exception as exc:
        logger.error(f"ATS score error: {str(exc)}")
        return json_error(str(exc), 500)
