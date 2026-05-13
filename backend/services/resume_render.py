"""Resume HTML templates and PDF rendering helpers."""
import pathlib
import re

from jinja2 import Environment, FileSystemLoader, select_autoescape

BACKEND_DIR = pathlib.Path(__file__).resolve().parent.parent


def backend_templates_root() -> pathlib.Path:
    return BACKEND_DIR / "templates"


def _resume_jinja_env() -> Environment:
    if not hasattr(_resume_jinja_env, "_env"):
        _resume_jinja_env._env = Environment(
            loader=FileSystemLoader(str(backend_templates_root())),
            autoescape=select_autoescape(["html", "xml"]),
        )
    return _resume_jinja_env._env


def template_exists(template_id: str) -> bool:
    t_root = backend_templates_root() / template_id
    return (t_root / "index.html").is_file() and (t_root / "style.css").is_file()


# Prepended to every resume stylesheet for WeasyPrint / wkhtmltopdf: A4 page box,
# no extra body padding (otherwise 210mm + padding exceeds the sheet and clips),
# flex children must be allowed to shrink, long URLs must wrap.
_RESUME_RENDER_BASE_CSS = """
@page { size: A4; margin: 0; }
html, body {
  margin: 0 !important;
  padding: 0 !important;
  height: auto !important;
  max-width: 100%;
}
.page {
  box-sizing: border-box;
  max-width: 100%;
}
.sidebar, .main-content, .left-column, .right-column, .left-sidebar, .right-content,
.container, .content, .header {
  min-width: 0;
}
.entry-header, .experience-header, .education-header {
  min-width: 0;
}
.entry-title, .job-title-main, .degree-name, .exp-title, .edu-degree,
.summary-text, .section-text, .contact-info, .contact-link, .detail-item,
.lead-summary, .job-title {
  overflow-wrap: break-word;
  word-break: normal;
}
.entry-title, .job-title-main, .degree-name {
  flex: 1 1 auto;
  min-width: 0;
}
.entry-date, .date-range {
  flex-shrink: 0;
}
""".strip()


def render_resume_html(template_id: str, data: dict) -> str:
    template = _resume_jinja_env().get_template(f"{template_id}/index.html")
    rendered = template.render(**data)
    rendered = re.sub(
        r'<link[^>]+rel=["\']stylesheet["\'][^>]*>\s*',
        "",
        rendered,
        flags=re.IGNORECASE,
    )
    css_path = backend_templates_root() / template_id / "style.css"
    css = _RESUME_RENDER_BASE_CSS + "\n" + css_path.read_text(encoding="utf-8")
    style_tag = f"<style>\n{css}\n</style>\n"
    if "</head>" in rendered:
        return rendered.replace("</head>", style_tag + "</head>", 1)
    return style_tag + rendered


def html_to_pdf_bytes(html: str) -> bytes:
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