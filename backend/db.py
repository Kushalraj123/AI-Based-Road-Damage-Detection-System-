import os
import json
import time
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load .env configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

MONGODB_URI = os.getenv("MONGODB_URI", "")
DB_NAME = os.getenv("MONGODB_DB_NAME", "road_damage_db")
HISTORY_FILE = os.path.join(BASE_DIR, "history.json")

# In-memory storage for notifications fallback
_memory_notifications: List[Dict[str, Any]] = []

mongo_client = None
db = None
is_connected = False
connection_error = None

try:
    from pymongo import MongoClient
    from pymongo.server_api import ServerApi
    import certifi

    if MONGODB_URI and MONGODB_URI.strip():
        # Connect to MongoDB Atlas using certifi certificate authority
        ca = certifi.where()
        try:
            mongo_client = MongoClient(
                MONGODB_URI,
                server_api=ServerApi('1'),
                tlsCAFile=ca,
                serverSelectionTimeoutMS=6000,
                connectTimeoutMS=6000
            )
            # Verify connection by pinging
            mongo_client.admin.command('ping')
        except Exception as ssl_err:
            # Fallback connection without strict SSL checking if system TLS certs differ
            print(f"[MongoDB] Retrying connection with TLS configuration fallback: {ssl_err}")
            mongo_client = MongoClient(
                MONGODB_URI,
                server_api=ServerApi('1'),
                tls=True,
                tlsAllowInvalidCertificates=True,
                serverSelectionTimeoutMS=6000,
                connectTimeoutMS=6000
            )
            mongo_client.admin.command('ping')
            
        db = mongo_client[DB_NAME]
        is_connected = True
        print(f"[MongoDB] Connected to MongoDB Atlas! Database: '{DB_NAME}'")
        
        # Ensure indexes on collections
        try:
            db.detection_history.create_index([("timestamp", -1)])
            db.detection_history.create_index([("id", 1)], unique=True)
            db.municipal_notifications.create_index([("id", 1)], unique=True)
        except Exception as idx_err:
            print(f"[MongoDB] Index setup note: {idx_err}")

    else:
        print("[MongoDB] Notice: MONGODB_URI not configured in .env. Running in local fallback mode.")
except Exception as e:
    connection_error = str(e)
    is_connected = False
    db = None
    print(f"[MongoDB] Warning: MongoDB Atlas connection failed ({e}). Falling back to local storage.")


def get_db_status() -> Dict[str, Any]:
    """Return the status of the MongoDB Atlas connection."""
    return {
        "connected": is_connected,
        "database": DB_NAME if is_connected else None,
        "mode": "mongodb_atlas" if is_connected else "local_fallback",
        "error": connection_error if not is_connected and MONGODB_URI else None,
        "uri_configured": bool(MONGODB_URI and MONGODB_URI.strip())
    }


# ==========================================
# Detection History Functions
# ==========================================

def load_local_history() -> List[Dict[str, Any]]:
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_local_history(history: List[Dict[str, Any]]):
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=4)
    except Exception as e:
        print(f"Error saving local history: {e}")

def get_detection_history(limit: int = 5000) -> List[Dict[str, Any]]:
    """Retrieve all detection records, ordered newest first."""
    if is_connected and db is not None:
        try:
            records = list(db.detection_history.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
            return records
        except Exception as e:
            print(f"MongoDB read error: {e}. Falling back to local file.")
    return load_local_history()

def add_detection_record(entry: Dict[str, Any]):
    """Insert a new scan detection into MongoDB Atlas and local file."""
    # 1. Save to MongoDB Atlas if connected
    if is_connected and db is not None:
        try:
            record_copy = dict(entry)
            db.detection_history.update_one(
                {"id": record_copy.get("id")},
                {"$set": record_copy},
                upsert=True
            )
        except Exception as e:
            print(f"MongoDB write error: {e}")
    
    # 2. Also keep local history file updated as dual-sync/backup
    local_hist = load_local_history()
    # Filter out if already exists, then prepend
    local_hist = [h for h in local_hist if h.get("id") != entry.get("id")]
    local_hist.insert(0, entry)
    save_local_history(local_hist[:5000])

def clear_detection_history():
    """Clear history in MongoDB Atlas and local file."""
    if is_connected and db is not None:
        try:
            db.detection_history.delete_many({})
        except Exception as e:
            print(f"MongoDB clear error: {e}")
    save_local_history([])


# ==========================================
# Municipal Notifications / Work Orders
# ==========================================

def add_municipal_notification(entry: Dict[str, Any]):
    """Insert a new municipal work order or dispatch notification."""
    global _memory_notifications
    if is_connected and db is not None:
        try:
            db.municipal_notifications.update_one(
                {"id": entry.get("id")},
                {"$set": entry},
                upsert=True
            )
        except Exception as e:
            print(f"MongoDB notification write error: {e}")
            
    _memory_notifications.insert(0, entry)

def get_municipal_notifications() -> List[Dict[str, Any]]:
    """Retrieve all municipal notifications."""
    if is_connected and db is not None:
        try:
            return list(db.municipal_notifications.find({}, {"_id": 0}).sort("timestamp", -1))
        except Exception as e:
            print(f"MongoDB notification read error: {e}")
    return _memory_notifications


# Initial Migration: If MongoDB is connected and history collection is empty, migrate existing local records
def auto_migrate_local_history_to_mongodb():
    if is_connected and db is not None:
        try:
            count = db.detection_history.count_documents({})
            if count == 0:
                local_data = load_local_history()
                if local_data:
                    # Clean out any ObjectId or duplicate keys
                    for item in local_data:
                        if "_id" in item:
                            del item["_id"]
                    db.detection_history.insert_many(local_data)
                    print(f"[MongoDB] Migrated {len(local_data)} local historical scans to MongoDB Atlas.")
        except Exception as e:
            print(f"[MongoDB] Auto-migration note: {e}")

# Run auto migration on module load if connected
if is_connected:
    auto_migrate_local_history_to_mongodb()
