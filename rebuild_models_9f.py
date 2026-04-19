import os, joblib, json
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import LabelEncoder

os.makedirs("ml_models", exist_ok=True)

feature_cols = [
    "source_port","dest_port","bytes_sent","bytes_received",
    "failed_logins","request_rate","is_internal_src","proto","severity_num"
]

# synthetic training data with 9 columns
X = np.array([
    [12345, 80, 500, 700, 0, 10, 0, 1, 1],
    [23456, 443, 900, 1300, 1, 30, 0, 1, 2],
    [34567, 22, 200, 300, 8, 60, 0, 1, 3],
    [45678, 3389, 1500, 2200, 12, 90, 0, 1, 4],
    [56789, 53, 120, 180, 0, 8, 1, 2, 1],
    [22222, 445, 1800, 2500, 15, 110, 0, 1, 4],
], dtype=float)

y_attack_labels = np.array(["benign","dos","probe","r2l","benign","dos"])

# Encoders
le_attack = LabelEncoder().fit(["benign","dos","probe","r2l","u2r"])
y = le_attack.transform(y_attack_labels)

le_proto = LabelEncoder().fit(["tcp","udp","icmp"])

# Models
rf = RandomForestClassifier(n_estimators=30, random_state=42)
rf.fit(X, y)

iso = IsolationForest(random_state=42)
iso.fit(X)

# Save exactly what ai_model.py loads
joblib.dump(rf, "ml_models/random_forest.pkl")
joblib.dump(iso, "ml_models/isolation_forest.pkl")
joblib.dump(le_attack, "ml_models/label_encoder_attack.pkl")
joblib.dump(le_proto, "ml_models/label_encoder_proto.pkl")

with open("ml_models/model_metadata.json", "w", encoding="utf-8") as f:
    json.dump({"feature_cols": feature_cols}, f, indent=2)

print("Rebuilt compatible ml_models artifacts.")
