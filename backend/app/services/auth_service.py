import uuid
from datetime import datetime
from fastapi import HTTPException, status
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.config import settings
from app.models.user import UserRole
from app.schemas.user import UserCreate
from app.schemas.auth import LoginRequest, TokenResponse
from app.utils.helpers import serialize_doc
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token


def new_professional_profile(user_id: str) -> dict:
    """Profil professionnel vide, créé à l'inscription ou au changement de rôle."""
    now = datetime.utcnow()
    return {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "bio": None,
        "years_experience": 0,
        "hourly_rate": None,
        "fixed_rate": None,
        "competence_domains": [],
        "trades": [],
        "skills": [],
        "badges": [],
        "availability": {},
        "reputation_score": 0.0,
        "total_reviews": 0,
        "is_featured": False,
        "is_premium": False,
        "portfolio_urls": [],
        "linkedin_url": None,
        "website_url": None,
        "created_at": now,
        "updated_at": now,
    }


def register_user(db: Database, data: UserCreate) -> dict:
    if db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Un compte avec cet email existe déjà")

    if data.phone and db.users.find_one({"phone": data.phone}):
        raise HTTPException(status_code=400, detail="Ce numéro de téléphone est déjà utilisé")

    now = datetime.utcnow()
    user = {
        "_id": str(uuid.uuid4()),
        "email": data.email,
        "phone": data.phone,
        "password_hash": hash_password(data.password),
        "first_name": data.first_name,
        "last_name": data.last_name,
        "role": data.role,
        "is_active": True,
        "is_verified": False,
        "profile_picture_url": None,
        "country": data.country or settings.DEFAULT_COUNTRY,
        "region": data.region,
        "city": data.city,
        "created_at": now,
        "updated_at": now,
    }
    try:
        db.users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Un compte avec cet email ou ce numéro existe déjà")

    if data.role == UserRole.PROFESSIONAL:
        db.professional_profiles.insert_one(new_professional_profile(user["_id"]))

    return serialize_doc(user)


def login_user(db: Database, data: LoginRequest) -> TokenResponse:
    user = db.users.find_one({"email": data.email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )
    if not user["is_active"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Compte désactivé")

    from app.schemas.user import UserResponse
    access_token = create_access_token({"sub": str(user["_id"]), "role": user["role"]})
    refresh_token = create_refresh_token({"sub": str(user["_id"])})

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(serialize_doc(user)),
    )


def refresh_access_token(db: Database, refresh_token: str) -> dict:
    from app.utils.security import decode_token
    payload = decode_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Token de rafraîchissement invalide")

    user = db.users.find_one({"_id": payload.get("sub")})
    if not user or not user["is_active"]:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable ou désactivé")

    access_token = create_access_token({"sub": str(user["_id"]), "role": user["role"]})
    return {"access_token": access_token, "token_type": "bearer"}
