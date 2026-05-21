import os

from core.security import get_password_hash
from database.mongodb import db


def seed_admin_if_enabled() -> None:
    """
    Seed a deterministic admin user for CI/tests.

    Enabled only when SEED_ADMIN_ON_STARTUP=1.
    This avoids changing tests and makes /auth/login pass in GitHub Actions.
    """
    if os.getenv("SEED_ADMIN_ON_STARTUP", "0") != "1":
        return

    admin_email = os.getenv("SEED_ADMIN_EMAIL", "admin@soc.local").lower()
    admin_password = os.getenv("SEED_ADMIN_PASSWORD", "Admin@123")

    users = db()["users"]

    # Seed both fields to stay compatible with both auth implementations:
    # - routes/auth.py checks `password_hash`
    # - services/auth_service.py checks `hashed_password`
    password_hash = get_password_hash(admin_password)

    users.update_one(
        {"email": admin_email},
        {
            "$setOnInsert": {
                "id": "seeded-admin",
                "email": admin_email,
                "role": "admin",
                "disabled": False,
                "full_name": "Seeded Admin",
                "password_hash": password_hash,
                "hashed_password": password_hash,
            }
        },
        upsert=True,
    )