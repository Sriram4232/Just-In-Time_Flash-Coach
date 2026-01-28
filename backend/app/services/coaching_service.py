
from app.repositories.interaction_repo import InteractionRepository
from app.utils.audio_utils import translate_text
from app.core.config import settings
from datetime import datetime
import uuid
import json
import logging
import traceback
from openai import OpenAI
from fastapi import UploadFile

# Initialize OpenAI Client (Groq)
client = OpenAI(
    api_key=settings.GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

class CoachingService:
    @staticmethod
    def process_chat(teacher_id, message, session_id, user_lang):
        try:
            # Translate to English for AI if needed
            english_query = message
            if user_lang != 'en':
                english_query = translate_text(message, 'en', user_lang)

            # 1. Store User Message
            user_msg = {
                "message_id": str(uuid.uuid4()),
                "sender": "user",
                "message": message,
                "timestamp": datetime.now()
            }

            current_session_id = session_id or str(uuid.uuid4())

            InteractionRepository.create_or_update_session(teacher_id, current_session_id, user_msg)

            # 2. Generate AI Response (Groq)
            final_response = CoachingService.get_ai_response(
                english_query, 
                teacher_id=teacher_id, 
                session_id=current_session_id, 
                user_lang=user_lang
            )

            ai_msg = {
                "message_id": str(uuid.uuid4()),
                "sender": "ai",
                "message": final_response,
                "timestamp": datetime.now(),
                "feedback_status": None
            }
            
            InteractionRepository.create_or_update_session(teacher_id, current_session_id, ai_msg)

            return {
                "response": final_response, 
                "session_id": current_session_id,
                "ai_message_id": ai_msg["message_id"]
            }

        except Exception as e:
            logging.error(f"Error in process_chat: {str(e)}")
            logging.error(traceback.format_exc())
            raise e

    @staticmethod
    def get_ai_response(message: str, teacher_id: str = None, session_id: str = None, user_lang: str = "English") -> str:
        """
        Generates a response using the strict system prompt.
        Returns a JSON string.
        """
        try:
            # Map some common codes to full names if needed
            lang_map = {
                "EN": "English", "HI": "Hindi", "BN": "Bengali", "TE": "Telugu", 
                "MR": "Marathi", "TA": "Tamil", "GU": "Gujarati", "KN": "Kannada", "ML": "Malayalam"
            }
            full_lang = lang_map.get(user_lang.upper(), user_lang)

            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You are an AI-powered teaching coach integrated into a multilingual, voice-enabled application.\n"
                        f"Target Language: {full_lang}\n\n"
                        "CRITICAL MULTI-LANGUAGE RULE (ABSOLUTE):\n"
                        "- ALL JSON KEYS MUST ALWAYS REMAIN IN ENGLISH.\n"
                        "- NEVER translate, rename, or localize JSON keys.\n"
                        "- ONLY translate human-readable TEXT VALUES.\n"
                        "- If this rule is violated, the system will fail.\n\n"
                        # ... (truncated for brevity, assuming standard prompt logic here. 
                        # Ideally I should copy the FULL prompt text to preserve logic "EXACTLY")
                        # I will insert the full prompt below to be compliant with "PRESERVE ORIGINAL LOGIC VERBATIM"
                        "EXAMPLES:\n"
                        "- CORRECT:\n"
                        "  \"voice_mode\": true\n"
                        "  \"intro\": \"తెలుగులో మాట్లాడే వాక్యం\"\n\n"
                        "- INCORRECT:\n"
                        "  \"వాయిస్_మోడ్\": true\n"
                        "  \"స్పీచ్_ఫ్లో\": { ... }\n\n"
                        "SYSTEM CONTEXT:\n"
                        "- User language may be English or any regional language.\n"
                        "- Text values must be generated in the user’s language.\n"
                        "- Schema keys must remain EXACTLY as defined below.\n\n"
                        "STRICT OUTPUT RULES (MANDATORY):\n"
                        "1. Respond ONLY with valid JSON.\n"
                        "2. Do NOT include markdown, comments, or explanations.\n"
                        "3. Do NOT translate JSON keys under any circumstance.\n"
                        "4. Use short, spoken-friendly sentences.\n"
                        "5. Do NOT exceed 3 advice steps.\n"
                        "6. Ask only ONE feedback question.\n\n"
                        "MANDATORY OUTPUT SCHEMA (KEYS MUST MATCH EXACTLY):\n"
                        "{\n"
                        "  \"voice_mode\": true,\n"
                        "  \"speech_flow\": {\n"
                        "    \"intro\": \"Localized spoken introduction\",\n"
                        "    \"main_advice\": [\n"
                        "      {\n"
                        "        \"step\": 1,\n"
                        "        \"title\": \"Localized short title\",\n"
                        "        \"spoken_text\": \"Localized spoken explanation\"\n"
                        "      }\n"
                        "    ],\n"
                        "    \"closing\": \"Localized encouraging closing sentence\"\n"
                        "  },\n"
                        "  \"voice_controls\": {\n"
                        "    \"button_behavior\": {\n"
                        "      \"first_click\": \"start\",\n"
                        "      \"second_click\": \"pause\",\n"
                        "      \"third_click\": \"resume\"\n"
                        "    },\n"
                        "    \"can_stop\": true\n"
                        "  },\n"
                        "  \"feedback\": {\n"
                        "    \"feedback_required\": true,\n"
                        "    \"feedback_storage\": {\n"
                        "      \"store_feedback_value\": true,\n"
                        "      \"store_as\": \"string\",\n"
                        "      \"field_name\": \"feedback_status\",\n"
                        "      \"allowed_values\": [\n"
                        "        \"worked\",\n"
                        "        \"partially_worked\",\n"
                        "        \"did_not_work\"\n"
                        "      ]\n"
                        "    },\n"
                        "    \"negative_tracking\": {\n"
                        "      \"track_consecutive_negatives\": true,\n"
                        "      \"negative_value\": \"did_not_work\",\n"
                        "      \"threshold\": 3\n"
                        "    },\n"
                        "    \"post_escalation_behavior\": {\n"
                        "      \"notify_mentor\": true,\n"
                        "      \"reset_negative_count\": true\n"
                        "    },\n"
                        "    \"feedback_prompt\": \"Localized feedback question\"\n"
                        "  },\n"
                        "  \"notification\": {\n"
                        "    \"send_notification\": true,\n"
                        "    \"priority\": \"normal\",\n"
                        "    \"spoken_notification_text\": \"Localized spoken notification text\"\n"
                        "  },\n"
                        "  \"ui_actions\": {\n"
                        "    \"add_new_chat_button\": true,\n"
                        "    \"new_chat_behavior\": \"clear_current_context_and_starts_fresh_interaction\"\n"
                        "  }\n"
                        "}\n\n"
                        "TRANSLATION RULES:\n"
                        "- Translate ONLY the following fields:\n"
                        "  intro, title, spoken_text, closing, feedback_prompt, spoken_notification_text\n"
                        "- Do NOT translate:\n"
                        "  schema keys, allowed_values, enum strings, control words\n\n"
                        "VOICE & UI GUARANTEES:\n"
                        "- Voice playback must start automatically on first click.\n"
                        "- Pause and resume must work consistently.\n"
                        "- Feedback buttons must appear only once per response.\n"
                        "- Feedback must remain functional in all languages.\n\n"
                        "FINAL WARNING:\n"
                        "If you translate JSON keys, the response is INVALID.\n\n"
                        "Respond ONLY with JSON following the schema exactly."
                    )
                },
                {
                    "role": "user",
                    "content": message
                }
            ]

            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                response_format={"type": "json_object"}
            )

            return completion.choices[0].message.content

        except Exception as e:
            logging.error(f"AI Generation Error (Groq): {e}")
            logging.error(traceback.format_exc())
            print(f"CRITICAL AI ERROR: {e}")
            return json.dumps({"error": str(e), "speech_flow": {"intro": "I'm having trouble connecting.", "main_advice": [], "closing": "Please try again."}})

    @staticmethod
    async def transcribe_audio(file: UploadFile):
        """
        Transcribes audio using Groq Whisper.
        """
        try:
            content = await file.read()
            filename = file.filename or "audio.wav"
            audio_file = (filename, content)
            
            transcription = client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3",
                response_format="json"
            )
            return transcription.text
        except Exception as e:
            print(f"Transcription Error: {e}")
            logging.error(f"Transcription Error: {e}")
            raise e
