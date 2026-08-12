from typing import Any

from core.security import create_access_token, get_current_user, verify_password
from fastapi import APIRouter, Depends, HTTPException, status
from models.schemas import LoginRequest, TokenResponse, UserProfile
from services.db_service import DBService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    user = DBService.get_user_by_email(payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    if user.get("disabled") is True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User is disabled"
        )

    if not verify_password(payload.password, str(user.get("password_hash", ""))):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    token = create_access_token(
        data={"sub": user["id"], "email": user["email"], "role": user["role"]}
    )

    return {"access_token": token, "token_type": "bearer", "role": str(user["role"])}


@router.get("/me", response_model=UserProfile)
def me(current_user: dict[str, Any] = Depends(get_current_user)):
    return {
        "id": str(current_user["id"]),
        "email": str(current_user["email"]),
        "full_name": str(current_user.get("full_name", "")),
        "role": str(current_user["role"]),
    }