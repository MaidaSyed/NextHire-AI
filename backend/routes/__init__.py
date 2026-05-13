"""Register Flask blueprints on the application."""

from flask import Flask


def register_routes(app: Flask) -> None:
    from routes.ats_routes import ats_bp
    from routes.interview_routes import interview_bp
    from routes.misc_routes import misc_bp
    from routes.resume_routes import resume_bp

    app.register_blueprint(resume_bp)
    app.register_blueprint(interview_bp)
    app.register_blueprint(ats_bp)
    app.register_blueprint(misc_bp)
