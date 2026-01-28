
from fastapi import APIRouter
from pydantic import BaseModel
from app.services.feedback_service import FeedbackService

router = APIRouter()

class FeedbackRequest(BaseModel):
    teacher_id: str
    session_id: str
    message_id: str
    feedback: str

@router.post("/feedback")
def feedback_endpoint(request: FeedbackRequest):
    return FeedbackService.process_feedback(
        request.teacher_id, 
        request.session_id, 
        request.message_id, 
        request.feedback
    )
