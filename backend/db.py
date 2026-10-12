import os
import json
import time
import threading
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load .env configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(BASE_DIR, ".env"))

# File paths for resilient local fallback storage
LOCAL_HISTORY_FILE = os.path.join(PROJECT_ROOT, "history.json")
LOCAL_NOTIFS_FILE = os.path.join(BASE_DIR, "notifications.json")

# MongoDB Atlas Credentials (Cluster0)
DEFAULT_ATLAS_URI = "mongodb+srv://Kushalraj1234:Road123@cluster0.0chzlij.mongodb.net/?appName=Cluster0"
MONGODB_URI = os.getenv("MONGODB_URI", "").strip() or DEFAULT_ATLAS_URI
DB_NAME = os.getenv("MONGODB_DB_NAME", "road_damage_db").strip()

mongo_client = None
db = None
is_connected = False
connection_error = None
_reconnect_lock = threading.Lock()
_last_reconnect_attempt = 0


# ==========================================
# Local Storage Helpers (Fallback Mode)
# ==========================================

def _read_local_history() -> List[Dict[str, Any]]:
    if not os.path.exists(LOCAL_HISTORY_FILE):
        return []
    try:
        with open(LOCAL_HISTORY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"[Local Storage] Warning reading history.json: {e}")
        return []


def _write_local_history(data: List[Dict[str, Any]]):
    try:
        with open(LOCAL_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(f"[Local Storage] Warning writing history.json: {e}")


def _read_local_notifications() -> List[Dict[str, Any]]:
    if not os.path.exists(LOCAL_NOTIFS_FILE):
        return []
    try:
        with open(LOCAL_NOTIFS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        print(f"[Local Storage] Warning reading notifications.json: {e}")
        return []


def _write_local_notifications(data: List[Dict[str, Any]]):
    try:
        with open(LOCAL_NOTIFS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(f"[Local Storage] Warning writing notifications.json: {e}")


# ==========================================
# MongoDB Atlas Connection & Sync
# ==========================================

def connect_to_mongodb():
    """Attempt to establish connection to MongoDB Atlas."""
    global mongo_client, db, is_connected, connection_error, _last_reconnect_attempt

    _last_reconnect_attempt = time.time()
    try:
        from pymongo import MongoClient
        from pymongo.server_api import ServerApi
        import certifi

        ca = certifi.where()

        try:
            client = MongoClient(
                MONGODB_URI,
                server_api=ServerApi('1'),
                tlsCAFile=ca,
                serverSelectionTimeoutMS=4000,
                connectTimeoutMS=4000
            )
            client.admin.command('ping')
        except Exception as first_err:
            client = MongoClient(
                MONGODB_URI,
                tlsCAFile=ca,
                serverSelectionTimeoutMS=4000,
                connectTimeoutMS=4000
            )
            client.admin.command('ping')

        mongo_client = client
        db = mongo_client[DB_NAME]
        is_connected = True
        connection_error = None
        print(f"[MongoDB Atlas] Successfully connected! Database: '{DB_NAME}'")

        # Create indexes
        try:
            db.detection_history.create_index([("timestamp", -1)])
            db.detection_history.create_index([("id", 1)], unique=True)
            db.municipal_notifications.create_index([("id", 1)], unique=True)
            db.municipal_notifications.create_index([("timestamp", -1)])
        except Exception as idx_err:
            print(f"[MongoDB Atlas] Index setup notice: {idx_err}")

        # Sync local cache into Atlas in background
        threading.Thread(target=_sync_local_to_atlas, daemon=True).start()

    except Exception as e:
        err_str = str(e)
        if "TLSV1_ALERT_INTERNAL_ERROR" in err_str:
            connection_error = (
                "IP Access List restriction: Your current IP address is not whitelisted in MongoDB Atlas. "
                "In MongoDB Atlas, navigate to 'Network Access' -> 'Add IP Address' -> 'Add Current IP Address' (or 0.0.0.0/0)."
            )
        else:
            connection_error = err_str
        is_connected = False
        db = None
        print(f"[MongoDB Atlas] Notice: Atlas unreachable ({connection_error}). Resilient local storage active.")


def _sync_local_to_atlas():
    """Sync any local entries to MongoDB Atlas once connection is restored."""
    global is_connected, db
    if not is_connected or db is None:
        return
    try:
        local_records = _read_local_history()
        for rec in local_records:
            r = dict(rec)
            if "_id" in r:
                del r["_id"]
            if r.get("id"):
                db.detection_history.update_one({"id": r["id"]}, {"$set": r}, upsert=True)
        print(f"[MongoDB Atlas] Synced {len(local_records)} local records to Atlas cloud.")
    except Exception as e:
        print(f"[MongoDB Atlas] Sync notice: {e}")


def _trigger_background_reconnect():
    """Non-blocking background reconnect trigger (max once every 20 seconds)."""
    global _last_reconnect_attempt
    if time.time() - _last_reconnect_attempt > 20:
        threading.Thread(target=connect_to_mongodb, daemon=True).start()


# Initial connection attempt
connect_to_mongodb()


def get_db_status() -> Dict[str, Any]:
    """Return the status of the database connection."""
    if not is_connected:
        _trigger_background_reconnect()
    return {
        "connected": is_connected,
        "database": DB_NAME if is_connected else "Local File Storage (Fallback)",
        "mode": "mongodb_atlas" if is_connected else "local_fallback",
        "error": connection_error if not is_connected else None,
        "uri_configured": bool(MONGODB_URI)
    }


# ==========================================
# Detection History (MongoDB + Resilient Local Fallback)
# ==========================================

def get_detection_history(limit: int = 5000) -> List[Dict[str, Any]]:
    """Retrieve all detection records from MongoDB Atlas or local fallback."""
    if is_connected and db is not None:
        try:
            records = list(db.detection_history.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
            return records
        except Exception as e:
            print(f"[MongoDB Atlas] Read failed: {e}. Falling back to local storage.")
            _trigger_background_reconnect()

    return _read_local_history()[:limit]


def add_detection_record(entry: Dict[str, Any]):
    """Insert or update a detection record in MongoDB Atlas and local fallback."""
    record_copy = dict(entry)
    if "_id" in record_copy:
        del record_copy["_id"]

    # Always persist locally first so data is never lost
    local_data = _read_local_history()
    existing_idx = next((i for i, r in enumerate(local_data) if r.get("id") == record_copy.get("id")), None)
    if existing_idx is not None:
        local_data[existing_idx] = record_copy
    else:
        local_data.insert(0, record_copy)
    _write_local_history(local_data)

    # Persist to Atlas if connected
    if is_connected and db is not None:
        try:
            db.detection_history.update_one(
                {"id": record_copy.get("id")},
                {"$set": record_copy},
                upsert=True
            )
        except Exception as e:
            print(f"[MongoDB Atlas] Write notice: {e}. Saved to local fallback.")
            _trigger_background_reconnect()
    else:
        _trigger_background_reconnect()


def clear_detection_history():
    """Clear detection records in both MongoDB Atlas and local fallback."""
    _write_local_history([])
    if is_connected and db is not None:
        try:
            db.detection_history.delete_many({})
        except Exception as e:
            print(f"[MongoDB Atlas] Clear notice: {e}")
            _trigger_background_reconnect()


# ==========================================
# Municipal Notifications / Work Orders
# ==========================================

def add_municipal_notification(entry: Dict[str, Any]):
    """Insert or update a municipal dispatch work order."""
    entry_copy = dict(entry)
    if "_id" in entry_copy:
        del entry_copy["_id"]

    local_notifs = _read_local_notifications()
    existing_idx = next((i for i, r in enumerate(local_notifs) if r.get("id") == entry_copy.get("id")), None)
    if existing_idx is not None:
        local_notifs[existing_idx] = entry_copy
    else:
        local_notifs.insert(0, entry_copy)
    _write_local_notifications(local_notifs)

    if is_connected and db is not None:
        try:
            db.municipal_notifications.update_one(
                {"id": entry_copy.get("id")},
                {"$set": entry_copy},
                upsert=True
            )
        except Exception as e:
            print(f"[MongoDB Atlas] Notification write notice: {e}")
            _trigger_background_reconnect()


def get_municipal_notifications() -> List[Dict[str, Any]]:
    """Retrieve municipal notifications."""
    if is_connected and db is not None:
        try:
            return list(db.municipal_notifications.find({}, {"_id": 0}).sort("timestamp", -1))
        except Exception as e:
            print(f"[MongoDB Atlas] Notification read notice: {e}")
            _trigger_background_reconnect()

    return _read_local_notifications()
