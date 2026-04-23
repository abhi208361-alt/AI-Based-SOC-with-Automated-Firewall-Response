import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from database.mongodb import connect_mongo, close_mongo  # IMPORTANT: not backend.database.mongodb


@pytest.fixture(scope="session", autouse=True)
def mongo_lifecycle():
    connect_mongo()
    yield
    close_mongo()


def test_login_success_seeded_admin():
    with TestClient(app) as client:
        payload = {"email": "admin@soc.local", "password": "Admin@123"}
        res = client.post("/api/v1/auth/login", json=payload)
        assert res.status_code == 200, res.text
        data = res.json()
        assert "access_token" in data
        assert data.get("token_type", "").lower() == "bearer"


def test_reports_generate_unauthorized_without_token():
    with TestClient(app) as client:
        payload = {"incident_id": f"INC-{uuid.uuid4().hex[:8]}"}
        res = client.post("/api/v1/reports/generate", json=payload)
        assert res.status_code in (401, 403), res.text


def test_reports_generate_success_with_token():
    with TestClient(app) as client:
        login_payload = {"email": "admin@soc.local", "password": "Admin@123"}
        login_res = client.post("/api/v1/auth/login", json=login_payload)
        assert login_res.status_code == 200, login_res.text
        token = login_res.json()["access_token"]

        incident_id = f"INC-{uuid.uuid4().hex[:8]}"
        headers = {"Authorization": f"Bearer {token}"}
        res = client.post(
            "/api/v1/reports/generate",
            json={"incident_id": incident_id},
            headers=headers,
        )
        assert res.status_code == 200, res.text

        data = res.json()
        assert "report_name" in data and "report_path" in data
        assert incident_id in data["report_name"]
        assert Path(data["report_path"]).exists()