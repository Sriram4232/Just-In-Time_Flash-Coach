
import requests
import wave
import struct
import os

# 1. Generate a simple WAV file (1 second of silence/tone)
filename = "test_audio.wav"
with wave.open(filename, 'w') as wav_file:
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(44100)
    data = struct.pack('<h', 0) * 44100 # 1 sec silence
    wav_file.writeframes(data)

print(f"Created {filename}")

# 2. Upload to Endpoint
url = "http://127.0.0.1:8000/api/speech-to-text"
try:
    with open(filename, 'rb') as f:
        print("Sending request...")
        files = {'audio': (filename, f, 'audio/wav')}
        data = {'lang': 'en-US'}
        response = requests.post(url, files=files, data=data)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

except Exception as e:
    print(f"Test Failed: {e}")

# Cleanup
if os.path.exists(filename):
    os.remove(filename)
