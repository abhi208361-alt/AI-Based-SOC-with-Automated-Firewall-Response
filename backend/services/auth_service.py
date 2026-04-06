from fastapi import HTTPException
from core.security import verify_password, create_access_token
from database.mongodb import get_db


class AuthService:
    @staticmethod
    def login(email: str, password: str) -> dict:
        db = get_db()
        user = db["users"].find_one({"email": email.lower()})
        if not user or user.get("disabled"):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        if not verify_password(password, user["hashed_password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token = create_access_token(subject=user["email"], role=user["role"])
        return {"access_token": token, "token_type": "bearer", "role": user["role"]}

    @staticmethod
    def get_profile(email: str) -> dict:
        db = get_db()
        user = db["users"].find_one({"email": email.lower()}, {"_id": 0, "hashed_password": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user