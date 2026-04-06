from datetime import datetime, timezone
from database.mongodb import connect_mongo, close_mongo, db
from core.security import hash_password


def upsert_user(email: str, full_name: str, role: str, plain_password: str):
    users = db()["users"]
    users.update_one(
        {"email": email},
        {
            "$set": {
                "email": email,
                "full_name": full_name,
                "role": role,
                "password_hash": hash_password(plain_password),  # plain password only
                "updated_at": datetime.now(timezone.utc),
            },
            "$setOnInsert": {
                "created_at": datetime.now(timezone.utc),
            },
        },
        upsert=True,
    )


def main():
    connect_mongo()

    # IMPORTANT: plain text here, not hash
    upsert_user("admin@soc.local", "SOC Admin", "admin", "Admin@123")
    upsert_user("analyst@soc.local", "SOC Analyst", "analyst", "Analyst@123")

    print("Seed complete")
    close_mongo()


if __name__ == "__main__":
    main()