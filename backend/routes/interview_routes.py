"""Interview question, evaluation, and session summary APIs."""

import logging

from flask import Blueprint, jsonify, request

from http_utils import json_error
from services.interview_service import (
    evaluate_interview_answer,
    generate_interview_question,
    summarize_interview_session,
)

logger = logging.getLogger(__name__)

interview_bp = Blueprint("interview", __name__)


@interview_bp.route("/api/generate-question", methods=["POST"])
@interview_bp.route("/generate-question", methods=["POST"])
def generate_question():
    try:
        logger.info("Interview question request received")
        payload = request.get_json(silent=True) or {}
        if not isinstance(payload, dict):
            payload = {}
        return jsonify(generate_interview_question(payload))
    except Exception as exc:
        logger.error(f"Interview question error: {str(exc)}")
        return json_error(str(exc), 500)


@interview_bp.route("/api/evaluate-answer", methods=["POST"])
@interview_bp.route("/evaluate-answer", methods=["POST"])
def evaluate_answer():
    try:
        logger.info("Interview evaluation request received")
        payload = request.get_json(silent=True) or {}
        if not isinstance(payload, dict):
            payload = {}
        return jsonify(evaluate_interview_answer(payload))
    except Exception as exc:
        logger.error(f"Interview evaluation error: {str(exc)}")
        return json_error(str(exc), 500)


@interview_bp.route("/api/interview-summary", methods=["POST"])
@interview_bp.route("/interview-summary", methods=["POST"])
def interview_summary():
    try:
        logger.info("Interview summary request received")
        payload = request.get_json(silent=True) or {}
        if not isinstance(payload, dict):
            payload = {}
        return jsonify(summarize_interview_session(payload))
    except Exception as exc:
        logger.error(f"Interview summary error: {str(exc)}")
        return json_error(str(exc), 500)
