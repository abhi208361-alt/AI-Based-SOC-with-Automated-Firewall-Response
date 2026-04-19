import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd


class AIModelPipeline:
    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent / "ml_models"
        self.rf = None
        self.iso = None
        self.le_attack = None
        self.le_proto = None
        self.meta = None
        self._load()

    def _load(self):
        self.rf = joblib.load(self.base_dir / "random_forest.pkl")
        self.iso = joblib.load(self.base_dir / "isolation_forest.pkl")
        self.le_attack = joblib.load(self.base_dir / "label_encoder_attack.pkl")
        self.le_proto = joblib.load(self.base_dir / "label_encoder_proto.pkl")
        self.meta = json.loads((self.base_dir / "model_metadata.json").read_text(encoding="utf-8"))

    def predict(self, sample: dict) -> dict:
        feature_cols = self.meta["feature_cols"]

        proto_value = str(sample.get("proto", "tcp")).lower()
        if proto_value not in list(self.le_proto.classes_):
            proto_value = "tcp"

        row = {
            "source_port": int(sample.get("source_port", 0)),
            "dest_port": int(sample.get("dest_port", 0)),
            "bytes_sent": int(sample.get("bytes_sent", 0)),
            "bytes_received": int(sample.get("bytes_received", 0)),
            "failed_logins": int(sample.get("failed_logins", 0)),
            "request_rate": int(sample.get("request_rate", 0)),
            "is_internal_src": int(sample.get("is_internal_src", 0)),
            "proto": int(self.le_proto.transform([proto_value])[0]),
            "severity_num": int(sample.get("severity_num", 1)),
        }

        X = pd.DataFrame([row], columns=feature_cols)

        pred_id = int(self.rf.predict(X)[0])
        attack_type = str(self.le_attack.inverse_transform([pred_id])[0])

        probs = self.rf.predict_proba(X)[0]
        confidence = float(np.max(probs))

        iso_pred = int(self.iso.predict(X)[0])
        iso_score = float(self.iso.decision_function(X)[0])
        anomaly = bool(iso_pred == -1)

        anomaly_boost = 25 if anomaly else 0
        risk_score = min(100, int(confidence * 75) + anomaly_boost)

        return {
            "predicted_attack_type": attack_type,
            "confidence": round(confidence, 4),
            "anomaly_detected": anomaly,
            "anomaly_score": round(iso_score, 4),
            "risk_score": int(risk_score),
        }


ai_pipeline = None


def get_ai_pipeline() -> AIModelPipeline:
    global ai_pipeline
    if ai_pipeline is None:
        ai_pipeline = AIModelPipeline()
    return ai_pipeline
