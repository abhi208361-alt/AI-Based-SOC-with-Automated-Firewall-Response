from core.security import create_access_token, get_current_user, verify_password
from fastapi import APIRouter, Depends, HTTPException
from models.schemas import LoginRequest, TokenResponse, UserProfile
from services.db_service import DBService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    user = DBService.get_user_by_email(payload.email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(
        data={"sub": user["id"], "email": user["email"], "role": user["role"]}
    )

    return {"access_token": token, "token_type": "bearer", "role": user["role"]}


@router.get("/me", response_model=UserProfile)
def me(current_user=Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "full_name": current_user.get("full_name", ""),
        "role": current_user["role"],
    }
