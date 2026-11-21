from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.user import UserPublic


class ProfessionalProfileBase(BaseModel):
    bio: Optional[str] = None
    years_experience: int = Field(0, ge=0, le=60)
    hourly_rate: Optional[float] = Field(None, ge=0)
    fixed_rate: Optional[float] = Field(None, ge=0)
    competence_domains: List[str] = []
    trades: List[str] = []
    skills: List[str] = []
    availability: Dict[str, Any] = {}
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None

    @field_validator("hourly_rate", "fixed_rate", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        return None if v == "" else v


class ProfessionalProfileCreate(ProfessionalProfileBase):
    pass


class ProfessionalProfileUpdate(BaseModel):
    bio: Optional[str] = None
    years_experience: Optional[int] = Field(None, ge=0, le=60)
    hourly_rate: Optional[float] = Field(None, ge=0)
    fixed_rate: Optional[float] = Field(None, ge=0)
    competence_domains: Optional[List[str]] = None
    trades: Optional[List[str]] = Field(None, max_length=5)
    skills: Optional[List[str]] = None
    availability: Optional[Dict[str, Any]] = None
    portfolio_urls: Optional[List[str]] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None

    @field_validator("hourly_rate", "fixed_rate", "years_experience", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        return None if v == "" else v


class ProfessionalProfileResponse(ProfessionalProfileBase):
    id: str
    user_id: str
    reputation_score: float
    total_reviews: int
    is_featured: bool
    is_premium: bool
    portfolio_urls: List[str] = []
    badges: List[str] = []
    created_at: datetime
    updated_at: datetime
    user: Optional[UserPublic] = None

    model_config = {"from_attributes": True}


class ProfessionalSearchResult(BaseModel):
    id: str
    user: Optional[UserPublic] = None
    bio: Optional[str]
    years_experience: int
    hourly_rate: Optional[float]
    fixed_rate: Optional[float]
    competence_domains: List[str] = []
    trades: List[str] = []
    skills: List[str] = []
    reputation_score: float
    total_reviews: int
    is_featured: bool
    badges: List[str] = []

    model_config = {"from_attributes": True}


class PaginatedProfessionals(BaseModel):
    items: List[ProfessionalSearchResult]
    total: int
    page: int
    size: int
    pages: int
