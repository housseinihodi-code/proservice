from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserPublic


class EvaluationCreate(BaseModel):
    mission_id: str
    target_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=2000)


class EvaluationResponse(BaseModel):
    id: str
    mission_id: str
    author_id: str
    target_id: str
    rating: int
    comment: Optional[str] = None
    response: Optional[str] = None
    is_flagged: bool
    created_at: datetime
    author: Optional[UserPublic] = None

    model_config = {"from_attributes": True}


class EvaluationResponseUpdate(BaseModel):
    response: str = Field(..., min_length=10, max_length=1000)


class FlagEvaluation(BaseModel):
    reason: str = Field(..., min_length=10, max_length=500)


class PaginatedEvaluations(BaseModel):
    items: List[EvaluationResponse]
    total: int
    page: int
    size: int
    pages: int
