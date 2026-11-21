from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.document import DocumentType, DocumentStatus


class DocumentResponse(BaseModel):
    id: str
    professional_id: str
    type: DocumentType
    name: str
    storage_url: str
    validation_status: DocumentStatus
    validated_by: Optional[str] = None
    validation_date: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentValidation(BaseModel):
    status: DocumentStatus
    rejection_reason: Optional[str] = None
