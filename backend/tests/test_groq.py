
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("GROQ_API_KEY")
print(f"Testing Groq with Key: {key[:5]}... ({len(key)} chars)")

client = OpenAI(
    api_key=key,
    base_url="https://api.groq.com/openai/v1"
)

try:
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "Hello"}],
    )
    print("Success!")
    print(completion.choices[0].message.content)
except Exception as e:
    print(f"Groq Failed: {e}")
