
from app.repositories.teacher_repo import TeacherRepository
from app.utils.two_fa_confirmation import verify_otp, generate_secret # Will create this helper or inline it?
# Original code had two_fa_confirmation.py. I'll duplicate logic or better inline it since it's small service logic.
import bcrypt
import pyotp
from datetime import datetime
from bson import ObjectId

class AuthService:
    @staticmethod
    def signup(teacher_name, teacher_mail, password, crp_name, crp_mail):
        # Check if user exists
        if TeacherRepository.get_by_email(teacher_mail):
             # Handled by exception or return None
             raise ValueError("Email already registered")

        # Hash password
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Generate OTP Secret
        otp_secret = pyotp.random_base32() # Logic from generate_secret

        teacher_doc = {
            "teacher_id": str(ObjectId()), 
            "teacher_name": teacher_name,
            "teacher_mail": teacher_mail,
            "passwordHash": hashed.decode('utf-8'),
            "crp_name": crp_name,
            "crp_mail": crp_mail,
            "otp_secret": otp_secret, 
            "failedFeedbackCount": 0,
            "createdAt": datetime.now(),
            "lastLogin": None
        }
        
        TeacherRepository.create_teacher(teacher_doc)
        
        return {
            "teacher_id": teacher_doc["teacher_id"],
            "otp_secret": otp_secret,
            "otp_auth_url": pyotp.TOTP(otp_secret).provisioning_uri(name=teacher_mail, issuer_name="FlashCoach")
        }

    @staticmethod
    def login(email, password, otp):
        teacher = TeacherRepository.get_by_email(email)
        
        if not teacher:
            raise ValueError("Invalid credentials")
            
        # Verify Password
        if not bcrypt.checkpw(password.encode('utf-8'), teacher["passwordHash"].encode('utf-8')):
            raise ValueError("Invalid credentials")
            
        # Verify OTP
        otp_secret = teacher.get("otp_secret")
        if not otp_secret:
             raise PermissionError("2FA not set up")
             
        totp = pyotp.TOTP(otp_secret)
        if not totp.verify(otp):
             raise ValueError("Invalid OTP")
            
        # Success
        TeacherRepository.update_last_login(teacher["teacher_id"])
        
        return {
            "teacher_id": teacher["teacher_id"],
            "name": teacher["teacher_name"]
        }
