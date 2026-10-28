import ipaddress
import json
import re
import sys
import zipfile
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


ROOT_DIR = Path(__file__).resolve().parents[1]

DATA_DIR = ROOT_DIR / "data" / "cic_ids_2017"
EXTRACTED_DIR = DATA_DIR / "extracted"

MODEL_DIR = ROOT_DIR / "ml_models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_COLS = [
    "source_port",
    "dest_port",
    "bytes_sent",
    "bytes_received",
    "failed_logins",
    "request_rate",
    "is_internal_src",
    "proto",
    "severity_num",
]


def normalize_column_name(value: str) -> str:
    value = str(value).strip().lower()
    value = value.replace("/", "_per_")
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return value.strip("_")


def normalize_dataframe_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [normalize_column_name(column) for column in df.columns]
    return df


def find_column(df: pd.DataFrame, candidates: list[str]) -> str | None:
    available = set(df.columns)

    for candidate in candidates:
        normalized = normalize_column_name(candidate)
        if normalized in available:
            return normalized

    return None


def numeric_column(
    df: pd.DataFrame,
    candidates: list[str],
    default: float = 0,
) -> pd.Series:
    column = find_column(df, candidates)

    if column is None:
        return pd.Series(default, index=df.index, dtype="float64")

    values = (
        df[column]
        .astype(str)
        .str.replace(",", "", regex=False)
        .str.strip()
    )

    values = pd.to_numeric(values, errors="coerce")
    return values.fillna(default)


def text_column(
    df: pd.DataFrame,
    candidates: list[str],
    default: str = "",
) -> pd.Series:
    column = find_column(df, candidates)

    if column is None:
        return pd.Series(default, index=df.index, dtype="object")

    return df[column].fillna(default).astype(str).str.strip()


def extract_archives() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)

    zip_files = list(DATA_DIR.glob("*.zip"))

    if not zip_files:
        print("No ZIP files found. Using existing CSV files.")
        return

    for archive in zip_files:
        archive_target = EXTRACTED_DIR / archive.stem
        archive_target.mkdir(parents=True, exist_ok=True)

        print(f"Extracting {archive.name}...")
        with zipfile.ZipFile(archive, "r") as zip_ref:
            zip_ref.extractall(archive_target)


def discover_csv_files() -> list[Path]:
    preferred_dir = DATA_DIR / "MachineLearningCSV"

    if preferred_dir.exists():
        csv_files = sorted(preferred_dir.glob("*.csv"))

        if csv_files:
            print(f"Using MachineLearningCSV directory: {preferred_dir}")
            for csv_file in csv_files:
                print(f"  - {csv_file.relative_to(ROOT_DIR)}")
            return csv_files

    fallback_dirs = [
        DATA_DIR / "GeneratedLabelledflowsCSV",
        DATA_DIR / "GeneratedLabelledFlowsCSV",
        EXTRACTED_DIR,
    ]

    csv_files = []

    for directory in fallback_dirs:
        if directory.exists():
            csv_files.extend(directory.rglob("*.csv"))

    csv_files = sorted(
        {
            str(path): path
            for path in csv_files
        }.values()
    )

    if not csv_files:
        raise FileNotFoundError(
            f"No CSV files found under: {DATA_DIR}"
        )

    print("Using fallback CSV files:")
    for csv_file in csv_files:
        print(f"  - {csv_file.relative_to(ROOT_DIR)}")

    return csv_files


def load_csv_files(csv_files: list[Path]) -> pd.DataFrame:
    frames = []

    for csv_file in csv_files:
        print(f"Loading {csv_file.name}...")
        try:
            frame = pd.read_csv(
                csv_file,
                low_memory=False,
                encoding_errors="ignore",
            )
        except UnicodeDecodeError:
            frame = pd.read_csv(
                csv_file,
                low_memory=False,
                encoding="latin-1",
            )

        frame = normalize_dataframe_columns(frame)

        if frame.empty:
            print(f"Skipping empty file: {csv_file.name}")
            continue

        frame["source_file"] = csv_file.name
        frames.append(frame)

    if not frames:
        raise RuntimeError("No usable CSV files were loaded.")

    combined = pd.concat(frames, ignore_index=True, sort=False)
    print(f"Combined raw rows: {len(combined):,}")
    return combined


def normalize_attack_label(label: str) -> str:
    value = str(label).strip()
    if not value:
        return "Unknown"

    normalized = value.lower()

    if normalized in {"benign", "normal", "normal traffic", "background"}:
        return "Benign"

    if "ddos" in normalized:
        return "DDoS"

    if normalized.startswith("dos"):
        return "DoS"

    if "web attack" in normalized:
        if "sql" in normalized:
            return "SQL Injection"
        if "xss" in normalized:
            return "XSS"
        if "brute" in normalized:
            return "Brute Force"
        return "Web Attack"

    if "bot" in normalized:
        return "Botnet"

    if "infiltration" in normalized:
        return "Infiltration"

    if "portscan" in normalized or "port scan" in normalized:
        return "Port Scan"

    if "patator" in normalized:
        return "Brute Force"

    if "heartbleed" in normalized:
        return "Heartbleed"

    if "brute force" in normalized:
        return "Brute Force"

    if "sql" in normalized:
        return "SQL Injection"

    if "xss" in normalized:
        return "XSS"

    return value


def protocol_to_text(value: object) -> str:
    text = str(value).strip().lower()
    protocol_map = {
        "6": "tcp",
        "17": "udp",
        "1": "icmp",
        "tcp": "tcp",
        "udp": "udp",
        "icmp": "icmp",
    }
    return protocol_map.get(text, "tcp")


def is_private_ip(value: object) -> int:
    try:
        address = ipaddress.ip_address(str(value).strip())
        return int(address.is_private)
    except ValueError:
        return 0


def build_project_features(raw: pd.DataFrame) -> pd.DataFrame:
    source_ip = text_column(
        raw,
        [
            "source_ip",
            "src_ip",
            "source",
            "src",
        ],
        default="",
    )

    label = text_column(
        raw,
        [
            "label",
            "attack_type",
            "attack",
            "category",
        ],
        default="Unknown",
    ).map(normalize_attack_label)

    protocol = text_column(
        raw,
        [
            "protocol",
            "proto",
            "ip_protocol",
            "protocol_name",
        ],
        default="tcp",
    ).map(protocol_to_text)

    source_port = numeric_column(
        raw,
        [
            "source_port",
            "src_port",
            "sport",
        ],
        default=0,
    )

    dest_port = numeric_column(
        raw,
        [
            "destination_port",
            "dest_port",
            "dst_port",
            "dport",
        ],
        default=0,
    )

    bytes_sent = numeric_column(
        raw,
        [
            "total_length_of_fwd_packets",
            "total_length_of_forward_packets",
            "bytes_sent",
            "fwd_packet_length_total",
        ],
        default=0,
    )

    bytes_received = numeric_column(
        raw,
        [
            "total_length_of_bwd_packets",
            "total_length_of_backward_packets",
            "bytes_received",
            "bwd_packet_length_total",
        ],
        default=0,
    )

    request_rate = numeric_column(
        raw,
        [
            "flow_packets_s",
            "flow_packets_per_s",
            "packets_per_second",
            "request_rate",
        ],
        default=0,
    )

    failed_logins = label.apply(
        lambda value: 10
        if "brute" in str(value).lower()
        or "patator" in str(value).lower()
        else 0
    )

    is_internal_src = source_ip.map(is_private_ip)

    severity_num = label.map(
        lambda value: (
            1
            if value == "Benign"
            else 4
            if value
            in {
                "DDoS",
                "DoS",
                "SQL Injection",
                "Ransomware",
                "Infiltration",
                "Heartbleed",
            }
            else 3
            if value
            in {
                "Brute Force",
                "Botnet",
                "XSS",
                "Web Attack",
            }
            else 2
        )
    )

    result = pd.DataFrame(
        {
            "source_port": source_port,
            "dest_port": dest_port,
            "bytes_sent": bytes_sent,
            "bytes_received": bytes_received,
            "failed_logins": failed_logins,
            "request_rate": request_rate,
            "is_internal_src": is_internal_src,
            "proto": protocol,
            "severity_num": severity_num,
            "attack_type": label,
        }
    )

    result = result.replace([np.inf, -np.inf], np.nan)
    result = result.dropna(subset=["attack_type"])

    for column in [
        "source_port",
        "dest_port",
        "bytes_sent",
        "bytes_received",
        "failed_logins",
        "request_rate",
        "is_internal_src",
        "severity_num",
    ]:
        result[column] = pd.to_numeric(
            result[column],
            errors="coerce",
        ).fillna(0)

    result["source_port"] = result["source_port"].clip(0, 65535)
    result["dest_port"] = result["dest_port"].clip(0, 65535)
    result["bytes_sent"] = result["bytes_sent"].clip(lower=0)
    result["bytes_received"] = result["bytes_received"].clip(lower=0)
    result["failed_logins"] = result["failed_logins"].clip(lower=0)
    result["request_rate"] = result["request_rate"].clip(lower=0)
    result["is_internal_src"] = result["is_internal_src"].clip(0, 1)
    result["severity_num"] = result["severity_num"].clip(1, 4)

    result = result[result["attack_type"].ne("Unknown")]
    result = result.drop_duplicates()

    return result


def train_models(training_df: pd.DataFrame) -> None:
    if training_df["attack_type"].nunique() < 2:
        raise RuntimeError(
            "At least two attack classes are required for training."
        )

    training_csv = ROOT_DIR / "ml_modules" / "training_data_cicids2017.csv"
    training_df.to_csv(training_csv, index=False)

    le_proto = LabelEncoder()
    training_df["proto"] = le_proto.fit_transform(
        training_df["proto"].astype(str)
    )

    le_attack = LabelEncoder()
    y = le_attack.fit_transform(training_df["attack_type"])

    X = training_df[FEATURE_COLS].copy()

    class_counts = training_df["attack_type"].value_counts()
    print("\nClass distribution:")
    print(class_counts.to_string())

    can_stratify = class_counts.min() >= 2

    split_args = {
        "test_size": 0.25,
        "random_state": 42,
    }

    if can_stratify:
        split_args["stratify"] = y

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        **split_args,
    )

    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=2,
        class_weight="balanced_subsample",
        n_jobs=-1,
        random_state=42,
    )

    rf.fit(X_train, y_train)
    predictions = rf.predict(X_test)

    print("\n=== Random Forest Evaluation ===")
    print(f"Accuracy: {accuracy_score(y_test, predictions):.4f}")
    print(
        classification_report(
            y_test,
            predictions,
            labels=list(range(len(le_attack.classes_))),
            target_names=list(le_attack.classes_),
            zero_division=0,
        )
    )

    iso = IsolationForest(
        n_estimators=250,
        contamination="auto",
        random_state=42,
        n_jobs=-1,
    )

    iso.fit(X)

    joblib.dump(rf, MODEL_DIR / "random_forest.pkl")
    joblib.dump(iso, MODEL_DIR / "isolation_forest.pkl")
    joblib.dump(le_attack, MODEL_DIR / "label_encoder_attack.pkl")
    joblib.dump(le_proto, MODEL_DIR / "label_encoder_proto.pkl")

    metadata = {
        "dataset": "CIC-IDS-2017",
        "feature_cols": FEATURE_COLS,
        "attack_classes": list(le_attack.classes_),
        "protocol_classes": list(le_proto.classes_),
        "rows": int(len(training_df)),
        "class_count": int(len(le_attack.classes_)),
        "training_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "train_date": pd.Timestamp.utcnow().isoformat(),
        "source_archives": [
            "MachineLearningCSV.zip",
            "Generatedlabelledflowscsv.zip",
        ],
    }

    (MODEL_DIR / "model_metadata.json").write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )

    print("\nModels saved to:")
    print(f"  {MODEL_DIR / 'random_forest.pkl'}")
    print(f"  {MODEL_DIR / 'isolation_forest.pkl'}")
    print(f"  {MODEL_DIR / 'label_encoder_attack.pkl'}")
    print(f"  {MODEL_DIR / 'label_encoder_proto.pkl'}")
    print(f"  {MODEL_DIR / 'model_metadata.json'}")


def main() -> None:
    extract_archives()
    csv_files = discover_csv_files()
    raw_df = load_csv_files(csv_files)

    print("\nConverting CIC-IDS-2017 columns to project features...")
    training_df = build_project_features(raw_df)

    print(f"Usable training rows: {len(training_df):,}")

    if training_df.empty:
        raise RuntimeError(
            "No usable rows were produced. Check the CSV column names."
        )

    train_models(training_df)


if __name__ == "__main__":
    main()