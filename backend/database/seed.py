import os

from backend.core.security import hash_password
from backend.services.db_service import DBService


def seed_admin_if_enabled() -> None:
    """
    Seed a deterministic admin user for CI/tests.

    Enabled only when SEED_ADMIN_ON_STARTUP=1.
    Works with Mongo when available and falls back to in-memory DBService store
    when Mongo is unavailable in CI.
    """
    if os.getenv("SEED_ADMIN_ON_STARTUP", "0") != "1":
        return

    admin_email = os.getenv("SEED_ADMIN_EMAIL", "admin@soc.local").lower()
    admin_password = os.getenv("SEED_ADMIN_PASSWORD", "Admin@123")
    password_hash = hash_password(admin_password)

    DBService.upsert_seed_user(
        {
            "id": "seeded-admin",
            "email": admin_email,
            "role": "admin",
            "disabled": False,
            "full_name": "Seeded Admin",
            # Keep both for compatibility across auth paths
            "password_hash": password_hash,
            "hashed_password": password_hash,
        }
    )