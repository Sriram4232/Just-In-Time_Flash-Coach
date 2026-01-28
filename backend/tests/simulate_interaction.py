
import requests
import uuid
import time

BASE_URL = "http://localhost:8000"
TEACHER_ID = "teacher_123" # Needs to match a valid teacher in DB or at least schema
SESSION_ID = str(uuid.uuid4())

def run_simulation():
    # Run 3 separate interactions to increment counter
    for i in range(1, 4):
        print(f"\n--- Interaction {i} ---")
        # 1. Send Chat
        resp = requests.post(f"{BASE_URL}/coaching/advice", json={
            "teacher_id": TEACHER_ID,
            "message": f"Test message {i}-{uuid.uuid4()}",
            "session_id": SESSION_ID,
            "user_lang": "en"
        })
        
        if resp.status_code != 200:
            print(f"Chat failed: {resp.text}")
            continue

        data = resp.json()
        print(f"Chat Response: {data}")
        msg_id = data.get("ai_message_id")
        print(f"Chat Success. Message ID: {msg_id}")
        
        time.sleep(1)

        # 2. Send Feedback
        print(f"Sending Negative Feedback for {msg_id}...")
        fb_resp = requests.post(f"{BASE_URL}/feedback", json={
            "teacher_id": TEACHER_ID,
            "session_id": SESSION_ID,
            "message_id": msg_id,
            "feedback": "did_not_work" 
        })
        print(f"Feedback Status: {fb_resp.status_code}")
        print(f"Response: {fb_resp.text}")
        time.sleep(1)

run_simulation()
