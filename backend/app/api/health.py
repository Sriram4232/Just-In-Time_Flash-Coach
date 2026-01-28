
from fastapi import APIRouter
from app.core.database import client

router = APIRouter()

@router.get("/")
def read_root():
    return {"message": "Flash Coach Backend is running"}

@router.get("/health")
def health_check():
    return {
        "status": "ok", 
        "service": "flash-coach-backend",
        "mongodb": "connected" if client else "error"
    }
