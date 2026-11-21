from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import List, Optional
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=2, max_length=100)
    last_name: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None

    @field_validator("email")
    @classmethod
    def lower_email(cls, v):
        return v.strip().lower()

    @field_validator("phone")
    @classmethod
    def blank_phone_to_none(cls, v):
        return v or None

    @field_validator("country", mode="before")
    @classmethod
    def normalize_country(cls, v):
        if v in (None, ""):
            return None
        v = str(v).strip().upper()
        if len(v) != 2 or not v.isalpha():
            raise ValueError("Code pays invalide (format ISO à 2 lettres, ex. FR)")
        return v


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    role: UserRole = UserRole.CLIENT

    @field_validator("role")
    @classmethod
    def public_roles_only(cls, v):
        if v not in (UserRole.CLIENT, UserRole.PROFESSIONAL):
            raise ValueError("Rôle non autorisé à l'inscription")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins une majuscule")
        if not any(c.isdigit() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre")
        return v


class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, min_length=2, max_length=100)
    last_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    profile_picture_url: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def blank_phone_to_none(cls, v):
        return v or None

    @field_validator("country", mode="before")
    @classmethod
    def normalize_country(cls, v):
        if v in (None, ""):
            return None
        v = str(v).strip().upper()
        if len(v) != 2 or not v.isalpha():
            raise ValueError("Code pays invalide (format ISO à 2 lettres, ex. FR)")
        return v


class UserResponse(UserBase):
    id: str
    role: UserRole
    is_active: bool
    is_verified: bool
    profile_picture_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPublic(BaseModel):
    id: str
    first_name: str
    last_name: str
    role: UserRole
    is_verified: bool
    profile_picture_url: Optional[str] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class PaginatedUsers(BaseModel):
    items: List[UserResponse]
    total: int
    page: int
    size: int
    pages: int
