import os

from backend.core.security import hash_password
from backend.database.mongodb import db


def seed_admin_if_enabled() -> None:
    if os.getenv("SEED_ADMIN_ON_STARTUP", "0") != "1":
        return

    admin_email = os.getenv("SEED_ADMIN_EMAIL", "admin@soc.local").lower()
    admin_password = os.getenv("SEED_ADMIN_PASSWORD", "Admin@123")

    try:
        users = db()["users"]
    except RuntimeError:
        return

    password_hash = hash_password(admin_password)

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