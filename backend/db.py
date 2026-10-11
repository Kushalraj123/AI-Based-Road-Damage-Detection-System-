import os
import time
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

# Load .env configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# MongoDB Atlas Credentials (Cluster0)
DEFAULT_ATLAS_URI = "mongodb+srv://Kushalraj1234:Road123@cluster0.0chzlij.mongodb.net/?appName=Cluster0"
MONGODB_URI = os.getenv("MONGODB_URI", "").strip() or DEFAULT_ATLAS_URI
DB_NAME = os.getenv("MONGODB_DB_NAME", "road_damage_db").strip()

mongo_client = None
db = None
is_connected = False
connection_error = None

try:
    from pymongo import MongoClient
    from pymongo.server_api import ServerApi
    import certifi

    ca = certifi.where()
    try:
        mongo_client = MongoClient(
            MONGODB_URI,
            server_api=ServerApi('1'),
            tlsCAFile=ca,
            serverSelectionTimeoutMS=8000,
            connectTimeoutMS=8000
        )
        # Verify connection by pinging Atlas
        mongo_client.admin.command('ping')
    except Exception as ssl_err:
        print(f"[MongoDB Atlas] Standard TLS retry with fallback: {ssl_err}")
        mongo_client = MongoClient(
            MONGODB_URI,
            server_api=ServerApi('1'),
            tls=True,
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=8000,
            connectTimeoutMS=8000
        )
        mongo_client.admin.command('ping')

    db = mongo_client[DB_NAME]
    is_connected = True
    print(f"[MongoDB Atlas] Successfully connected! Database: '{DB_NAME}' (Pure Cloud Storage Mode)")

    # Ensure required cloud indexes
    try:
        db.detection_history.create_index([("timestamp", -1)])
        db.detection_history.create_index([("id", 1)], unique=True)
        db.municipal_notifications.create_index([("id", 1)], unique=True)
        db.municipal_notifications.create_index([("timestamp", -1)])
    except Exception as idx_err:
        print(f"[MongoDB Atlas] Index setup notice: {idx_err}")

except Exception as e:
    connection_error = str(e)
    is_connected = False
    db = None
    print(f"[MongoDB Atlas] ERROR: Connection failed: {e}")


def get_db_status() -> Dict[str, Any]:
    """Return the status of the MongoDB Atlas connection."""
    return {
        "connected": is_connected,
        "database": DB_NAME if is_connected else None,
        "mode": "mongodb_atlas",
        "error": connection_error if not is_connected else None,
        "uri_configured": True
    }


# ==========================================
# Detection History (Exclusively MongoDB Atlas)
# ==========================================

def get_detection_history(limit: int = 5000) -> List[Dict[str, Any]]:
    """Retrieve all detection records strictly from MongoDB Atlas."""
    if not is_connected or db is None:
        raise RuntimeError(f"MongoDB Atlas is not connected: {connection_error}")
    
    records = list(db.detection_history.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit))
    return records


def add_detection_record(entry: Dict[str, Any]):
    """Insert or update a detection record strictly in MongoDB Atlas."""
    if not is_connected or db is None:
        raise RuntimeError(f"MongoDB Atlas is not connected: {connection_error}")
    
    record_copy = dict(entry)
    # Remove MongoDB internal _id if present
    if "_id" in record_copy:
        del record_copy["_id"]
        
    db.detection_history.update_one(
        {"id": record_copy.get("id")},
        {"$set": record_copy},
        upsert=True
    )


def clear_detection_history():
    """Clear all detection records strictly from MongoDB Atlas."""
    if not is_connected or db is None:
        raise RuntimeError(f"MongoDB Atlas is not connected: {connection_error}")
    
    db.detection_history.delete_many({})


# ==========================================
# Municipal Notifications / Work Orders (Exclusively MongoDB Atlas)
# ==========================================

def add_municipal_notification(entry: Dict[str, Any]):
    """Insert or update a municipal dispatch work order strictly in MongoDB Atlas."""
    if not is_connected or db is None:
        raise RuntimeError(f"MongoDB Atlas is not connected: {connection_error}")
    
    entry_copy = dict(entry)
    if "_id" in entry_copy:
        del entry_copy["_id"]
        
    db.municipal_notifications.update_one(
        {"id": entry_copy.get("id")},
        {"$set": entry_copy},
        upsert=True
    )


def get_municipal_notifications() -> List[Dict[str, Any]]:
    """Retrieve all municipal notifications strictly from MongoDB Atlas."""
    if not is_connected or db is None:
        raise RuntimeError(f"MongoDB Atlas is not connected: {connection_error}")
    
    return list(db.municipal_notifications.find({}, {"_id": 0}).sort("timestamp", -1))
