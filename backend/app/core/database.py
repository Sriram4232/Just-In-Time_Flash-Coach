
from pymongo import MongoClient
from app.core.config import settings
import logging

# Setup MongoDB
try:
    client = MongoClient(settings.MONGO_URI)
    db = client[settings.DB_NAME]
    
    teacher_collection = db["teacher_details"]
    history_collection = db["chat_history"]
    feedback_collection = db["feedback"]
    
    logging.info("MongoDB Connection Established")
except Exception as e:
    logging.error(f"Failed to connect to MongoDB: {e}")
    # Don't crash here because we want to allow import, but app might fail later if DB is needed
    client = None
    db = None
    teacher_collection = None
    history_collection = None
    feedback_collection = None
