
from app.core.database import teacher_collection
from bson import ObjectId
from datetime import datetime
import pymongo
from pymongo import ReturnDocument

class TeacherRepository:
    @staticmethod
    def get_by_email(email: str):
        return teacher_collection.find_one({"teacher_mail": email})
    
    @staticmethod
    def create_teacher(teacher_doc: dict):
        return teacher_collection.insert_one(teacher_doc)
        
    @staticmethod
    def get_teacher_by_id(teacher_id: str):
        return teacher_collection.find_one({"teacher_id": teacher_id})

    @staticmethod
    def update_last_login(teacher_id: str):
        teacher_collection.update_one(
            {"teacher_id": teacher_id},
            {"$set": {"lastLogin": datetime.now()}} # Although _id logic was used in app.py, teacher_id is safer if _id format varies
        )
        
    @staticmethod
    def increment_feedback_count(teacher_id: str):
        # Increment count BUT Cap at 3 (Retry Logic)
        return teacher_collection.find_one_and_update(
            {"teacher_id": teacher_id},
            [{"$set": {"failedFeedbackCount": {"$min": [{"$add": [{"$ifNull": ["$failedFeedbackCount", 0]}, 1]}, 3]}}}],
            return_document=ReturnDocument.AFTER
        )
        
    @staticmethod
    def reset_feedback_count(teacher_id: str):
        return teacher_collection.find_one_and_update(
            {"teacher_id": teacher_id},
            {"$set": {"failedFeedbackCount": 0}},
            return_document=ReturnDocument.AFTER
        )
