
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, coaching, feedback, health
from app.utils.logger import setup_logging

setup_logging()

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(coaching.router)
app.include_router(feedback.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    # Note: When running this file directly from backend/, import app.main might be tricky due to sys.path.
    # Recommended run command from backend/: python -m app.main
