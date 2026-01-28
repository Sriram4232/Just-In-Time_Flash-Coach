
import os
from dotenv import load_dotenv

# Load .env file
# Assumes structure: backend/app/core/config.py
# .env is in backend/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(BASE_DIR, ".env"))

class Settings:
    MONGO_URI = os.getenv("MONGO_URI")
    DB_NAME = os.getenv("DB_NAME", "flash_coach")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    EMAIL_SENDER = os.getenv("EMAIL_SENDER")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
    CRP_EMAIL_FALLBACK = os.getenv("CRP_EMAIL_FALLBACK")
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")

settings = Settings()
