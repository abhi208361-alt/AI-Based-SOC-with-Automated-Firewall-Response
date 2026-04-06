from typing import Dict
from core.security import hash_password

# Demo in-memory user store for Step 1
# Step 2+ can move this to MongoDB users collection.
USERS_DB: Dict[str, dict] = {
    "admin@soc.local": {
        "email": "admin@soc.local",
        "full_name": "SOC Admin",
        "role": "admin",
        "hashed_password": hash_password("Admin@123"),
        "disabled": False,
    },
    "analyst@soc.local": {
        "email": "analyst@soc.local",
        "full_name": "SOC Analyst",
        "role": "analyst",
        "hashed_password": hash_password("Analyst@123"),
        "disabled": False,
    },
}