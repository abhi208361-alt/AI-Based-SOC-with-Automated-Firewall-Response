<<<<<<< HEAD
# AI SOC Firewall (Capstone)

## Stack
- FastAPI backend
- MongoDB
- ML (RandomForest + IsolationForest)
- React + Tailwind frontend
- WebSocket real-time alerts

## Run (local)
1. Start MongoDB
2. Backend:
   ```bash
   cd backend
   .\.venv\Scripts\Activate.ps1
   python -m database.seed
   python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Default Users
- admin@soc.local / Admin@123
- analyst@soc.local / Analyst@123

## Key APIs
- `/api/v1/auth/login`
- `/api/v1/attacks`
- `/api/v1/ingestion/file`
- `/api/v1/ml/predict`
- `/api/v1/geo/lookup`
- `/api/v1/siem/export`
- `/ws/attacks`
=======
# AI-Based-SOC-with-Automated-Firewall-Response
>>>>>>> a580a152b22fc4320f39c2d468bead83c6c098a8
