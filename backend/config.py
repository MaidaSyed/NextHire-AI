import os


def get_setting(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    return value


def get_required_setting(name: str) -> str:
    value = get_setting(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value
