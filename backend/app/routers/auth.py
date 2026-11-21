from fastapi import APIRouter, Depends, HTTPException, Request
from pymongo.database import Database

from app.database import get_db
from app.schemas.user import UserCreate, UserResponse
from app.schemas.auth import LoginRequest, TokenResponse, RefreshTokenRequest
from app.services.auth_service import register_user, login_user, refresh_access_token
from app.utils.rate_limit import check_login_allowed, record_login_failure, reset_login_failures

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
def register(data: UserCreate, db: Database = Depends(get_db)):
    user = register_user(db, data)
    from app.services.email_service import send_welcome_email
    send_welcome_email(user["email"], user["first_name"])
    return user


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: Database = Depends(get_db)):
    keys = (f"email:{data.email.lower()}", f"ip:{request.client.host if request.client else '?'}")
    check_login_allowed(*keys)
    try:
        result = login_user(db, data)
    except HTTPException as e:
        if e.status_code == 401:
            record_login_failure(*keys)
        raise
    reset_login_failures(keys[0])
    return result


@router.post("/refresh")
def refresh(data: RefreshTokenRequest, db: Database = Depends(get_db)):
    return refresh_access_token(db, data.refresh_token)
