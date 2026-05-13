"""Health check and lightweight diagnostics."""

import logging

from flask import Blueprint, jsonify

logger = logging.getLogger(__name__)

misc_bp = Blueprint("misc", __name__)


@misc_bp.route("/api/test", methods=["GET"])
def test():
    logger.info("Health check endpoint called")
    return jsonify({"message": "Backend working!"})
