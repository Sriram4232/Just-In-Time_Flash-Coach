
from app.utils.send_email import send_escalation_email
from app.repositories.teacher_repo import TeacherRepository
from app.core.config import settings
import logging

class EscalationService:
    @staticmethod
    def process_escalation(teacher_id, session_id):
        teacher = TeacherRepository.get_teacher_by_id(teacher_id)
        if not teacher:
            return {"triggered": False, "status": "teacher_not_found"} # Should catch earlier
            
        current_count = teacher.get("failedFeedbackCount", 0)
        
        # Validation: Check Email Configuration
        config_valid = bool(settings.EMAIL_SENDER and settings.EMAIL_PASSWORD)
        
        if not config_valid:
             logging.warning("Escalation skipped: EMAIL_SENDER or EMAIL_PASSWORD missing.")
             return {
                "triggered": False,
                "status": "config_missing",
                "negative_count": current_count
            }

        if current_count == 3:
            logging.info(f"Threshold Reached (Count=3). Triggering Escalation for {teacher_id}")
            escalation_status = "sent"
            escalation_error = None
            
            try:
                # 1. Attempt to send email
                send_escalation_email(
                    teacher_name=teacher.get("teacher_name", "Unknown"),
                    teacher_email=teacher.get("teacher_mail", ""),
                    issue_summary=f"User reported 'did_not_work' with 3 continuous failures. Session: {session_id}",
                    recipient_email=teacher.get("crp_mail")
                )
                
                # 2. SUCCESS: Reset Counter (Strict Rule)
                try:
                    TeacherRepository.reset_feedback_count(teacher_id)
                    logging.info(f"Escalation Sent & Counter Reset for teacher {teacher_id}")
                except Exception as reset_error:
                    logging.error(f"CRITICAL: Email sent but counter reset failed: {reset_error}")

            except Exception as e:
                # 3. FAILURE: Do NOT Reset Counter (Strict Rule)
                logging.error(f"Escalation Failed: {e}")
                escalation_status = "failed"
                
                # SMTP Auth Error Handling (Gmail 535-5.7.8)
                error_str = str(e)
                if "535" in error_str and "5.7.8" in error_str:
                    escalation_error = "We could not authenticate the email service. Please contact support."
                elif "535" in error_str or "Authentication" in error_str or "Username and Password not accepted" in error_str:
                     escalation_error = "Email authentication failed. Please check server credentials."
                else:
                    escalation_error = error_str
            
            return {
                "triggered": True,
                "type": "mentor_email",
                "negative_count_before": current_count,
                "negative_count_after": 0 if escalation_status == "sent" else current_count,
                "status": escalation_status,
                "error": escalation_error
            }
        
        else:
            return {
                "triggered": False,
                "status": "count_update",
                "negative_count": current_count
            }
