
from openai import OpenAI
import os
from dotenv import load_dotenv
import json

load_dotenv()

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

try:
    print("Testing with JSON mode and System Prompt...")
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a helpful assistant. Respond in JSON with key 'answer'."},
            {"role": "user", "content": "Hello"}
        ],
        response_format={"type": "json_object"}
    )
    print("Success!")
    print(completion.choices[0].message.content)
except Exception as e:
    print(f"Groq Complex Failed: {e}")
