
from app.core.database import history_collection
from datetime import datetime
import uuid

class InteractionRepository:
    @staticmethod
    def get_history(teacher_id: str):
        doc = history_collection.find_one({"teacher_id": teacher_id})
        if doc and "_id" in doc:
             doc["_id"] = str(doc["_id"])
        return doc
        
    @staticmethod
    def create_or_update_session(teacher_id: str, session_id: str, message: dict):
        # Update or Create History Doc
        history_doc = history_collection.find_one({"teacher_id": teacher_id})
        
        if not history_doc:
            # Create new doc
            new_session = {
                "session_id": session_id,
                "messages": [message]
            }
            history_collection.insert_one({
                "teacher_id": teacher_id,
                "chat_history": [new_session]
            })
        else:
            # Check if session exists
            existing_session = next((s for s in history_doc.get("chat_history", []) if s["session_id"] == session_id), None)
            if existing_session:
                history_collection.update_one(
                    {"teacher_id": teacher_id, "chat_history.session_id": session_id},
                    {"$push": {"chat_history.$.messages": message}}
                )
            else:
                # Add new session
                new_session = {
                    "session_id": session_id,
                    "messages": [message]
                }
                history_collection.update_one(
                    {"teacher_id": teacher_id},
                    {"$push": {"chat_history": new_session}}
                )

    @staticmethod
    def update_feedback_status(teacher_id: str, session_id: str, message_id: str, feedback: str):
         # Update the specific message interaction with the feedback string
        result = history_collection.update_one(
            {"teacher_id": teacher_id, "chat_history.session_id": session_id},
            {"$set": {"chat_history.$[session].messages.$[msg].feedback_status": feedback}},
            array_filters=[
                {"session.session_id": session_id},
                {"msg.message_id": message_id}
            ]
        )
        return result.modified_count
