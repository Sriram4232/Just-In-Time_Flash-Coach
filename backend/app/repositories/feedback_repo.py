
from app.repositories.interaction_repo import InteractionRepository

class FeedbackRepository:
    # Thin wrapper or dedicated logic if collections separate.
    # Currently feedback updates interaction doc.
    # Keeping it simple as requested structure.
    
    @staticmethod
    def record_feedback(teacher_id: str, session_id: str, message_id: str, feedback: str):
        return InteractionRepository.update_feedback_status(teacher_id, session_id, message_id, feedback)
