
from deep_translator import GoogleTranslator
from gtts import gTTS
import speech_recognition as sr
import io
import base64
import os
import tempfile

# Translation helper function
def translate_text(text: str, target_lang: str, source_lang: str = 'auto') -> str:
    """Translate text to target language with better error handling."""
    try:
        if target_lang == 'en' and source_lang == 'auto':
             # Optimization: If text seems to be English, skip? 
             # For now, let translator handle it or just return if target is same as source (if known)
             pass
             
        if not text:
            return text
        
        # Mapping for deep_translator to Google Translate codes
        # deep_translator uses standard codes mostly
        
        print(f"[TRANSLATE] Translating {len(text)} chars: '{text[:50]}...' to {target_lang}")
        
        try:
            translator = GoogleTranslator(source=source_lang, target=target_lang)
            translated = translator.translate(text)
            return translated
        except Exception as e:
            print(f"Translation specific error: {e}")
            return text # Fallback
            
    except Exception as e:
        print(f"[ERROR] Translation error: {e}")
        return text

# Text-to-speech function
def text_to_speech(text: str, lang: str) -> str:
    """Convert text to speech and return base64 encoded audio."""
    try:
        if not text:
            return ""
            
        print(f"[TTS] TTS: Converting {len(text)} chars in {lang}")
        
        tts = gTTS(text=text, lang=lang, slow=False)
        
        # Use BytesIO to avoid file system operations
        audio_bytes = io.BytesIO()
        tts.write_to_fp(audio_bytes)
        audio_bytes.seek(0)
        
        # Encode to base64
        audio_base64 = base64.b64encode(audio_bytes.read()).decode('utf-8')
        return audio_base64
        
    except Exception as e:
        print(f"[ERROR] Text-to-speech error: {e}")
        return ""

def speech_to_text(audio_file_path: str, lang: str = 'en-US') -> str:
    """Convert audio file to text."""
    try:
        recognizer = sr.Recognizer()
        with sr.AudioFile(audio_file_path) as source:
            audio_data = recognizer.record(source)
            text = recognizer.recognize_google(audio_data, language=lang)
            return text
    except sr.UnknownValueError:
        print("[ERROR] STT: Google could not understand audio")
        return ""
    except sr.RequestError as e:
        print(f"[ERROR] STT: Google API Error: {e}")
        return ""
    except ValueError as e:
        print(f"[ERROR] STT: Audio Format Error (Likely WebM vs WAV): {e}")
        return "" # Frontend needs to send WAV
    except Exception as e:
        print(f"[ERROR] STT: General Error: {e}")
        import traceback
        traceback.print_exc()
        return ""
