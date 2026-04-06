from pathlib import Path
from log_parser import parse_log_line
from services.attack_service import AttackService


class LogIngestionService:
    @staticmethod
    def ingest_file(file_path: str) -> dict:
        p = Path(file_path)
        if not p.exists():
            return {"success": False, "ingested": 0, "failed": 0, "errors": [f"File not found: {file_path}"]}

        ingested = 0
        failed = 0
        errors = []

        with p.open("r", encoding="utf-8") as f:
            for idx, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    attack = parse_log_line(line)
                    AttackService.create_attack(attack)
                    ingested += 1
                except Exception as ex:
                    failed += 1
                    errors.append(f"line {idx}: {str(ex)}")

        return {"success": True, "ingested": ingested, "failed": failed, "errors": errors[:20]}