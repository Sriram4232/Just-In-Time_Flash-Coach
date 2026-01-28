
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
from app.services.coaching_service import CoachingService
from app.repositories.interaction_repo import InteractionRepository
from app.utils.audio_utils import text_to_speech, translate_text, speech_to_text
import tempfile
import shutil
import os
import uuid

router = APIRouter()

class ChatRequest(BaseModel):
    teacher_id: str
    message: str
    session_id: Optional[str] = None
    user_lang: str = "en"
    
class CoachingRequest(BaseModel):
    query: str

@router.post("/coaching/advice")
def chat_endpoint(request: ChatRequest):
    try:
        return CoachingService.process_chat(
            request.teacher_id,
            request.message,
            request.session_id,
            request.user_lang
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Legacy/Simple endpoint if still used? 
# The implementation details showed get_coaching_advice in app.py logic
# But the orchestrator used /coaching/advice with ChatRequest.
# app.py also had get_coaching_advice for CoachingRequest (simple query).
# I should ensure both are covered if they differ.
# Actually, orchestrator.py handled `chat_endpoint` at `/coaching/advice`.
# app.py had `get_coaching_advice` at `/coaching/advice` BUT `app.include_router(orchestrator_router)` was listed BEFORE `app.post("/coaching/advice")` in app.py?
# No, `orchestrator` had `@router.post("/coaching/advice")`.
# `app.py` had `@app.post("/coaching/advice")` later.
# FastAPI behavior: First one wins? Or duplicate route error?
# If orchestrator router was included, it likely took precedence or caused confusion.
# However, the user flow seems to rely on the ChatRequest one (streaming history, context).
# I will implement the ChatRequest one from Orchestrator as it's the Main Agent Logic.
# The `CoachingRequest` one was simple one-shot. I'll include it as `/coaching/simple_advice`? 
# Or assume Orchestrator was the intended one. Orchestrator was the primary logic file.
# I will implement the Orchestrator version as primary.

@router.get("/history/{teacher_id}")
def get_history(teacher_id: str):
    doc = InteractionRepository.get_history(teacher_id)
    if not doc:
        return {"chat_history": []}
    return doc

@router.post("/api/speech-to-text")
async def speech_to_text_endpoint(audio: UploadFile = File(...), lang: str = Form("en-US")):
    try:
        # Pass stream directly to Groq (handles WebM natively)
        text = await CoachingService.transcribe_audio(audio)
        
        # Filter Whisper hallucinations on silence
        cleaned = text.strip().lower()
        if cleaned in ["you", "thank you", "you.", "thank you."]:
            return {"text": ""}
            
        return {"text": text}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/text-to-speech")
def tts_endpoint(data: dict):
    text = data.get("text", "")
    lang = data.get("lang", "en")
    audio = text_to_speech(text, lang)
    return {"audio": audio}

@router.post("/api/translate")
def translate_endpoint(data: dict):
    text = data.get("text", "")
    target = data.get("target_lang", "en")
    source = data.get("source_lang", "auto")
    return {"translated": translate_text(text, target, source)}

@router.get("/api/languages")
def get_languages():
    return {
        'en': {'name': 'English', 'code': 'EN', 'voice': 'en-US', 'tts': 'en'},
        'hi': {'name': 'Hindi', 'code': 'HI', 'voice': 'hi-IN', 'tts': 'hi'},
        'te': {'name': 'Telugu', 'code': 'TE', 'voice': 'te-IN', 'tts': 'te'},
        'ta': {'name': 'Tamil', 'code': 'TA', 'voice': 'ta-IN', 'tts': 'ta'},
        'bn': {'name': 'Bengali', 'code': 'BN', 'voice': 'bn-IN', 'tts': 'bn'},
        'mr': {'name': 'Marathi', 'code': 'MR', 'voice': 'mr-IN', 'tts': 'mr'}
    }
