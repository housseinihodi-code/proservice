from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.user import UserPublic


class MessageCreate(BaseModel):
    receiver_id: str
    content: str = Field(..., min_length=1, max_length=5000)
    mission_id: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    mission_id: Optional[str] = None
    content: str
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    is_read: bool
    created_at: datetime
    sender: Optional[UserPublic] = None
    receiver: Optional[UserPublic] = None

    model_config = {"from_attributes": True}


class PaginatedMessages(BaseModel):
    items: List[MessageResponse]
    total: int
    page: int
    size: int
    pages: int
