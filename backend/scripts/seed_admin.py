from db import SessionLocal
from models.entities import User
from core.security import hash_password

EMAIL = "admin@soc.local"
PASSWORD = "Admin@123"


def run():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == EMAIL).first()
        if existing:
            print("Admin already exists")
            return
        user = User(
            email=EMAIL,
            full_name="SOC Admin",
            password_hash=hash_password(PASSWORD),
            role="admin",
            is_active=True,
        )
        db.add(user)
        db.commit()
        print(f"Created admin: {EMAIL} / {PASSWORD}")
    finally:
        db.close()


if __name__ == "__main__":
    run()