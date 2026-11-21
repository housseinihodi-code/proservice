from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from app.models.mission import PaymentStatus, MissionStatus
from app.schemas.user import UserPublic


class MissionCreate(BaseModel):
    professional_id: str
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=20)
    amount: float = Field(..., gt=0)
    deadline: Optional[datetime] = None
    offer_id: Optional[str] = None

    @field_validator("deadline", "offer_id", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        return None if v == "" else v


class MissionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    notes: Optional[str] = None

    @field_validator("deadline", mode="before")
    @classmethod
    def blank_to_none(cls, v):
        return None if v == "" else v


class MissionResponse(BaseModel):
    id: str
    client_id: str
    professional_id: str
    offer_id: Optional[str] = None
    title: str
    description: str
    amount: float
    commission_amount: float
    net_amount: float
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    deadline: Optional[datetime] = None
    payment_status: PaymentStatus
    mission_status: MissionStatus
    deliverable_validated: bool
    deliverable_url: Optional[str] = None
    delivery_note: Optional[str] = None
    delivered_at: Optional[datetime] = None
    notes: Optional[str] = None
    dispute_reason: Optional[str] = None
    has_my_evaluation: bool = False
    created_at: datetime
    updated_at: datetime
    client: Optional[UserPublic] = None
    professional: Optional[UserPublic] = None

    model_config = {"from_attributes": True}


class ValidateDeliverable(BaseModel):
    approved: bool
    notes: Optional[str] = None


class DeliverMission(BaseModel):
    deliverable_url: Optional[str] = Field(None, max_length=500)
    delivery_note: str = Field(..., min_length=5, max_length=2000)

    @field_validator("deliverable_url", mode="before")
    @classmethod
    def check_url(cls, v):
        if v in (None, ""):
            return None
        if not str(v).startswith(("http://", "https://")):
            raise ValueError("Le lien doit commencer par http:// ou https://")
        return v


class DisputeMission(BaseModel):
    reason: str = Field(..., min_length=10, max_length=2000)


class PaginatedMissions(BaseModel):
    items: List[MissionResponse]
    total: int
    page: int
    size: int
    pages: int
