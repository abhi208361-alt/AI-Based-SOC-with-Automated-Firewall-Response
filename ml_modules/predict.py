import json
from pathlib import Path
import joblib
import pandas as pd
import numpy as np

BASE_DIR = Path(__file__).resolve().parent

rf = joblib.load(BASE_DIR / "random_forest.pkl")
iso = joblib.load(BASE_DIR / "isolation_forest.pkl")
le_attack = joblib.load(BASE_DIR / "label_encoder_attack.pkl")
le_proto = joblib.load(BASE_DIR / "label_encoder_proto.pkl")
meta = json.loads((BASE_DIR / "model_metadata.json").read_text(encoding="utf-8"))

FEATURE_COLS = meta["feature_cols"]


def predict_one(sample: dict) -> dict:
    proto_value = sample.get("proto", "tcp")
    if proto_value not in list(le_proto.classes_):
        proto_value = "tcp"

    row = {
        "source_port": int(sample.get("source_port", 0)),
        "dest_port": int(sample.get("dest_port", 0)),
        "bytes_sent": int(sample.get("bytes_sent", 0)),
        "bytes_received": int(sample.get("bytes_received", 0)),
        "failed_logins": int(sample.get("failed_logins", 0)),
        "request_rate": int(sample.get("request_rate", 0)),
        "is_internal_src": int(sample.get("is_internal_src", 0)),
        "proto": int(le_proto.transform([proto_value])[0]),
        "severity_num": int(sample.get("severity_num", 1)),
    }

    X = pd.DataFrame([row], columns=FEATURE_COLS)

    pred_id = rf.predict(X)[0]
    pred_attack = le_attack.inverse_transform([pred_id])[0]
    probs = rf.predict_proba(X)[0]
    confidence = float(np.max(probs))

    iso_pred = iso.predict(X)[0]  # -1 anomaly, 1 normal
    iso_score = float(iso.decision_function(X)[0])

    anomaly_boost = 25 if iso_pred == -1 else 0
    risk_score = min(100, int(confidence * 75) + anomaly_boost)

    return {
        "predicted_attack_type": pred_attack,
        "confidence": round(confidence, 4),
        "anomaly_detected": iso_pred == -1,
        "anomaly_score": round(iso_score, 4),
        "risk_score": risk_score,
    }


if __name__ == "__main__":
    sample = {
        "source_port": 55221,
        "dest_port": 22,
        "bytes_sent": 1600,
        "bytes_received": 450,
        "failed_logins": 20,
        "request_rate": 16,
        "is_internal_src": 0,
        "proto": "tcp",
        "severity_num": 3
    }
    print(json.dumps(predict_one(sample), indent=2))