
import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings 

# Refactored to use settings, or os.getenv (but settings is preferred in new arch)
# Keeping os.getenv backup as per original logic to ensure behavior strictness?
# The original code used os.getenv inside the function.
# I will use os.getenv to keep logic identical, or use settings if equivalent.
# To be STRICT "DO NOT change any existing business logic", I will stick to os.getenv call or map settings.
# Actually, mapping settings is cleaner. global settings is already loaded.

def send_escalation_email(teacher_name: str, teacher_email: str, issue_summary: str, recipient_email: str = None):
    """
    Sends an escalation email to the CRP.
    Falls back to mock logging if credentials are not found.
    """
    sender_email = settings.EMAIL_SENDER
    sender_password = settings.EMAIL_PASSWORD
    # Use provided email or fallback
    crp_email = recipient_email or settings.CRP_EMAIL_FALLBACK or "admin@flashcoach.com"
    
    if recipient_email:
        logging.info(f"Escalation: Using Teacher-Specific CRP Email: {recipient_email}")
    else:
        logging.warning(f"Escalation: Teacher CRP missing. Using Fallback: {crp_email}") 

    # DEBUG: Print loaded credentials (masked)
    print(f"DEBUG: Active Sender: {sender_email}")
    print(f"DEBUG: Password Length: {len(sender_password) if sender_password else 0}")
    if sender_password:
         print(f"DEBUG: Password Starts With: {sender_password[:2]}...") 

    if not sender_email or not sender_password:
        logging.warning("Email credentials not set. Simulating email send.")
        print("**************************************************")
        print(f" [MOCK EMAIL] To: {crp_email}")
        print(f" [MOCK EMAIL] Subject: ESCALATION: Issue with {teacher_name}")
        print(f" [MOCK EMAIL] Body: {issue_summary}")
        print("**************************************************")
        return # Treat as success so the app logic proceeds

    message = MIMEMultipart("alternative")
    message["Subject"] = f"ESCALATION: Issue with {teacher_name}"
    message["From"] = sender_email
    message["To"] = crp_email

    text = f"""\
    Teacher Name: {teacher_name}
    Teacher Email: {teacher_email}
    
    Issue Summary:
    {issue_summary}
    
    Message: "AI solution failed 3 times. Human intervention required."
    """

    message.attach(MIMEText(text, "plain"))

    # Pass password as-is (proven to work by verification script)
    # if sender_password:
    #     sender_password = sender_password.replace(" ", "")

    smtp_server = settings.SMTP_SERVER
    smtp_port_ssl = 465
    smtp_port_tls = 587
    
    # 1. Try SSL (Port 465)
    try:
        with smtplib.SMTP_SSL(smtp_server, smtp_port_ssl) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, crp_email, message.as_string())
        logging.info("Escalation email sent successfully (SSL/465).")
        return
    except Exception as e_ssl:
        logging.warning(f"SSL (465) failed: {e_ssl}. Retrying with TLS (587)...")
        
        # 2. Fallback to TLS (Port 587)
        try:
            with smtplib.SMTP(smtp_server, smtp_port_tls) as server:
                server.starttls()
                server.login(sender_email, sender_password)
                server.sendmail(sender_email, crp_email, message.as_string())
            logging.info("Escalation email sent successfully (TLS/587).")
            return
        except Exception as e_tls:
             # Both failed
             final_error = f"SSL failed: {e_ssl} | TLS failed: {e_tls}"
             logging.error(f"Email Send Failed (Both methods): {final_error}")
             raise Exception(final_error) 
