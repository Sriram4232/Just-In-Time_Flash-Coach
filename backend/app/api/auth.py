
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.auth_service import AuthService

router = APIRouter()

class SignupRequest(BaseModel):
    teacher_name: str
    teacher_mail: str
    password: str
    crp_name: str
    crp_mail: str

class LoginRequest(BaseModel):
    email: str
    password: str
    otp: str

@router.post("/signup")
def signup(request: SignupRequest):
    try:
        result = AuthService.signup(
            request.teacher_name, 
            request.teacher_mail, 
            request.password, 
            request.crp_name, 
            request.crp_mail
        )
        return {"message": "Signup successful", **result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
def login(request: LoginRequest):
    try:
        result = AuthService.login(request.email, request.password, request.otp)
        return {"message": "Login successful", **result}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
