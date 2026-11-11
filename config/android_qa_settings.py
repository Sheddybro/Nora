"""CI emulator-only settings: never point this module at a production database."""
import os
from pathlib import Path

if os.environ.get("NORRIS_QA_ONLY") != "1":
    raise RuntimeError("Android QA settings require NORRIS_QA_ONLY=1")
if os.environ.get("DATABASE_URL"):
    raise RuntimeError("Android QA settings refuse DATABASE_URL override")

from .settings import *  # noqa: F403,F401,E402

db_path = os.environ.get("NORRIS_QA_SQLITE", "")
if not db_path.startswith("/tmp/norris-android-qa-") or Path(db_path).resolve().parent != Path("/tmp"):
    raise RuntimeError("Android QA database must be uniquely named in /tmp")

DATABASES = {"default": {
    "ENGINE": "django.db.backends.sqlite3",
    "NAME": db_path,
    "OPTIONS": {"timeout": 30},
}}
DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "10.0.2.2"]
CSRF_TRUSTED_ORIGINS = ["http://localhost:8000", "http://127.0.0.1:8000", "http://10.0.2.2:8000"]
