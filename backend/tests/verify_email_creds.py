
import smtplib
import os
from dotenv import load_dotenv

load_dotenv()

sender = os.getenv("EMAIL_SENDER")
password = os.getenv("EMAIL_PASSWORD")
smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")

print(f"Testing SMTP Auth for: {sender}")
print(f"Server: {smtp_server}")

try:
    # Try SSL (465)
    print("Attempting SSL (465)...")
    with smtplib.SMTP_SSL(smtp_server, 465) as server:
        server.login(sender, password)
        print("SUCCESS: SSL Authentication Accepted!")

except Exception as e_ssl:
    print(f"SSL Failed: {e_ssl}")
    
    try:
        # Try TLS (587)
        print("Attempting TLS (587)...")
        with smtplib.SMTP(smtp_server, 587) as server:
            server.starttls()
            server.login(sender, password)
            print("SUCCESS: TLS Authentication Accepted!")
    except Exception as e_tls:
        print(f"TLS Failed: {e_tls}")
        print("\nCONCLUSION: Google rejected the password. You MUST use an App Password.")
