"""Settings for browser E2E tests only.

Use a file-backed SQLite test database instead of Django's shared in-memory
SQLite database; concurrent Chromium requests and the live server use distinct
threads and must not fight over the same in-memory connection.
Never use this settings module for production.
"""
from .settings import *  # noqa: F403,F401

DATABASES["default"]["TEST"] = {"NAME": "/tmp/norrisbeauty-browser-ci-test.sqlite3"}
