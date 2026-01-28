
from app.repositories.feedback_repo import FeedbackRepository
from app.repositories.teacher_repo import TeacherRepository
from app.services.escalation_service import EscalationService
import logging

class FeedbackService:
    @staticmethod
    def process_feedback(teacher_id, session_id, message_id, feedback):
        # 1. Update the specific message interaction with the feedback string
        modified_count = FeedbackRepository.record_feedback(teacher_id, session_id, message_id, feedback)
        
        if modified_count == 0:
            logging.warning(f"Feedback Update Failed (No Doc Modified): Teacher={teacher_id}, Session={session_id}, Msg={message_id}")
            # IDEMPOTENCY FIX
            return {
                "message": "Feedback already recorded (no change)",
                "escalation": {"triggered": False, "status": "no_change"}
            }

        if feedback == "did_not_work":
            # Increment count BUT Cap at 3 (Retry Logic)
            TeacherRepository.increment_feedback_count(teacher_id)
            
            # Check for Escalation
            escalation_result = EscalationService.process_escalation(teacher_id, session_id)
            
            return {
                "message": "Feedback recorded. Escalation processed." if escalation_result.get("triggered") else "Feedback recorded",
                "escalation": escalation_result
            }

        else:
            # Reset count on positive/other feedback (Continuous Feedback Rule)
            TeacherRepository.reset_feedback_count(teacher_id)
            return {"message": "Feedback recorded. Count reset.", "escalation": {"triggered": False}}
