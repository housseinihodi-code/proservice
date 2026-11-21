from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.offer import OfferStatus, ApplicationStatus
from app.schemas.user import UserPublic


class OfferCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=20)
    domain: str
    trade: Optional[str] = None
    budget_min: Optional[float] = Field(None, ge=0)
    budget_max: Optional[float] = Field(None, ge=0)
    location_country: Optional[str] = None
    location_region: Optional[str] = None
    location_city: Optional[str] = None
    is_remote: Optional[str] = "false"
    deadline: Optional[datetime] = None

    @field_validator("deadline", "budget_min", "budget_max", "trade", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        return None if v == "" else v

    @field_validator("location_country", mode="before")
    @classmethod
    def normalize_country(cls, v):
        if v in (None, ""):
            return None
        v = str(v).strip().upper()
        if len(v) != 2 or not v.isalpha():
            raise ValueError("Code pays invalide (format ISO à 2 lettres, ex. FR)")
        return v


class OfferUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = Field(None, min_length=20)
    domain: Optional[str] = None
    trade: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    location_country: Optional[str] = None
    location_region: Optional[str] = None
    location_city: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[OfferStatus] = None

    @field_validator("deadline", "budget_min", "budget_max", "trade", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        return None if v == "" else v

    @field_validator("location_country", mode="before")
    @classmethod
    def normalize_country(cls, v):
        if v in (None, ""):
            return None
        v = str(v).strip().upper()
        if len(v) != 2 or not v.isalpha():
            raise ValueError("Code pays invalide (format ISO à 2 lettres, ex. FR)")
        return v


class OfferResponse(BaseModel):
    id: str
    client_id: str
    title: str
    description: str
    domain: str
    trade: Optional[str] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    location_country: Optional[str] = None
    location_region: Optional[str] = None
    location_city: Optional[str] = None
    is_remote: Optional[str] = None
    deadline: Optional[datetime] = None
    status: OfferStatus
    views_count: int
    created_at: datetime
    updated_at: datetime
    client: Optional[UserPublic] = None
    applications_count: Optional[int] = None

    model_config = {"from_attributes": True}


class ApplicationCreate(BaseModel):
    cover_letter: str = Field(..., min_length=50)
    proposed_rate: Optional[float] = Field(None, ge=0)

    @field_validator("proposed_rate", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        return None if v == "" else v


class ApplicationResponse(BaseModel):
    id: str
    offer_id: str
    professional_id: str
    professional_user_id: Optional[str] = None
    cover_letter: str
    proposed_rate: Optional[float] = None
    status: ApplicationStatus
    created_at: datetime
    updated_at: datetime
    professional: Optional[UserPublic] = None
    offer: Optional[OfferResponse] = None

    model_config = {"from_attributes": True}


class PaginatedOffers(BaseModel):
    items: List[OfferResponse]
    total: int
    page: int
    size: int
    pages: int
