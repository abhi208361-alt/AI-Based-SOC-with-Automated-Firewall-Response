from fastapi import APIRouter, Depends
from core.security import require_role
from models.schemas import AttackLogIn
from services.attack_service import AttackService

router = APIRouter(prefix="/attacks", tags=["Attacks"])


@router.get("", dependencies=[Depends(require_role(["admin", "analyst"]))])
def list_attacks():
    return AttackService.list_attacks()


@router.post("", dependencies=[Depends(require_role(["admin", "analyst"]))])
def create_attack(payload: AttackLogIn):
    return AttackService.create_attack(payload)