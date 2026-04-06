from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson import ObjectId

from database.mongodb import db


class DBService:
    @staticmethod
    def get_attack_collection():
        return db()["attacks"]

    @staticmethod
    def get_user_collection():
        return db()["users"]

    @staticmethod
    def get_firewall_collection():
        return db()["firewall_rules"]

    @staticmethod
    def get_incident_collection():
        return db()["incidents"]

    @staticmethod
    def _normalize_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
        if not doc:
            return doc
        out = dict(doc)
        if "_id" in out:
            out["id"] = str(out["_id"])
            del out["_id"]
        for k, v in list(out.items()):
            if isinstance(v, datetime):
                out[k] = v.isoformat()
        return out

    @staticmethod
    def _normalize_many(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [DBService._normalize_doc(d) for d in docs]

    @staticmethod
    def create_user(user_doc: Dict[str, Any]) -> Dict[str, Any]:
        col = DBService.get_user_collection()
        now = datetime.now(timezone.utc)
        user_doc.setdefault("created_at", now)
        user_doc.setdefault("updated_at", now)
        res = col.insert_one(user_doc)
        saved = col.find_one({"_id": res.inserted_id})
        return DBService._normalize_doc(saved)

    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        doc = DBService.get_user_collection().find_one({"email": email})
        return DBService._normalize_doc(doc) if doc else None

    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
        col = DBService.get_user_collection()
        try:
            doc = col.find_one({"_id": ObjectId(user_id)})
        except Exception:
            doc = col.find_one({"id": user_id})
        return DBService._normalize_doc(doc) if doc else None

    @staticmethod
    def insert_attack(item: Dict[str, Any]) -> Dict[str, Any]:
        col = DBService.get_attack_collection()
        now = datetime.now(timezone.utc)
        item.setdefault("timestamp", now)
        item.setdefault("created_at", now)
        item.setdefault("updated_at", now)
        res = col.insert_one(item)
        saved = col.find_one({"_id": res.inserted_id})
        return DBService._normalize_doc(saved)

    @staticmethod
    def list_attacks(limit: int = 500) -> List[Dict[str, Any]]:
        docs = list(DBService.get_attack_collection().find({}).sort("timestamp", -1).limit(limit))
        return DBService._normalize_many(docs)

    @staticmethod
    def search_attacks(filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        docs = list(DBService.get_attack_collection().find(filters).sort("timestamp", -1))
        return DBService._normalize_many(docs)

    @staticmethod
    def insert_firewall_rule(rule: Dict[str, Any]) -> Dict[str, Any]:
        col = DBService.get_firewall_collection()
        now = datetime.now(timezone.utc)
        rule.setdefault("created_at", now)
        rule.setdefault("updated_at", now)
        res = col.insert_one(rule)
        saved = col.find_one({"_id": res.inserted_id})
        return DBService._normalize_doc(saved)

    @staticmethod
    def list_firewall_rules(limit: int = 500) -> List[Dict[str, Any]]:
        docs = list(DBService.get_firewall_collection().find({}).sort("created_at", -1).limit(limit))
        return DBService._normalize_many(docs)

    @staticmethod
    def insert_incident(incident: Dict[str, Any]) -> Dict[str, Any]:
        col = DBService.get_incident_collection()
        now = datetime.now(timezone.utc)
        incident.setdefault("created_at", now)
        incident.setdefault("updated_at", now)
        res = col.insert_one(incident)
        saved = col.find_one({"_id": res.inserted_id})
        return DBService._normalize_doc(saved)