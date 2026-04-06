import json
from pathlib import Path
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "training_data.csv"

RF_MODEL_PATH = BASE_DIR / "random_forest.pkl"
ISO_MODEL_PATH = BASE_DIR / "isolation_forest.pkl"
LE_ATTACK_PATH = BASE_DIR / "label_encoder_attack.pkl"
LE_PROTO_PATH = BASE_DIR / "label_encoder_proto.pkl"
METADATA_PATH = BASE_DIR / "model_metadata.json"


def main():
    df = pd.read_csv(DATA_PATH)

    feature_cols = [
        "source_port", "dest_port", "bytes_sent", "bytes_received",
        "failed_logins", "request_rate", "is_internal_src", "proto", "severity_num"
    ]

    le_proto = LabelEncoder()
    df["proto"] = le_proto.fit_transform(df["proto"])

    le_attack = LabelEncoder()
    y = le_attack.fit_transform(df["attack_type"])
    X = df[feature_cols]

    # Safe split for small multi-class datasets:
    # no stratify to avoid class-count/test-size constraint failure.
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.30, random_state=42
    )

    rf = RandomForestClassifier(
        n_estimators=250,
        max_depth=14,
        random_state=42,
        class_weight="balanced_subsample"
    )
    rf.fit(X_train, y_train)
    y_pred = rf.predict(X_test)

    print("=== RandomForest Evaluation ===")
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    # keep zero_division to avoid warnings for classes absent in test split
    print(classification_report(y_test, y_pred, zero_division=0))

    iso = IsolationForest(
        n_estimators=200,
        contamination=0.15,
        random_state=42
    )
    iso.fit(X)

    joblib.dump(rf, RF_MODEL_PATH)
    joblib.dump(iso, ISO_MODEL_PATH)
    joblib.dump(le_attack, LE_ATTACK_PATH)
    joblib.dump(le_proto, LE_PROTO_PATH)

    metadata = {
        "feature_cols": feature_cols,
        "attack_classes": list(le_attack.classes_),
        "protocol_classes": list(le_proto.classes_),
        "rf_model_path": RF_MODEL_PATH.name,
        "iso_model_path": ISO_MODEL_PATH.name,
        "rows": int(len(df)),
        "class_count": int(len(le_attack.classes_))
    }

    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print("✅ Models saved in ml_models/")


if __name__ == "__main__":
    main()