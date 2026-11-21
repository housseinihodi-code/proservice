"""Formulaire de contact public et boîte de réception de l'équipe d'administration."""
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, Field, field_validator
from pymongo.database import Database

from app.database import get_db
from app.utils.helpers import paginate
from app.utils.rate_limit import check_login_allowed, record_login_failure
from app.utils.security import require_admin

router = APIRouter()
admin_router = APIRouter()

SUBJECTS = {"QUESTION", "ACCOUNT", "PAYMENT", "DISPUTE", "PARTNERSHIP", "OTHER"}


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    subject: str = "QUESTION"
    message: str = Field(..., min_length=10, max_length=3000)

    @field_validator("name", "message")
    @classmethod
    def strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("subject")
    @classmethod
    def known_subject(cls, v: str) -> str:
        return v if v in SUBJECTS else "OTHER"


@router.post("/", status_code=201)
def send_contact_message(data: ContactCreate, request: Request, db: Database = Depends(get_db)):
    # Anti-spam : 5 messages max par IP sur 15 minutes (même mécanisme que la connexion).
    key = f"contact:{request.client.host if request.client else '?'}"
    check_login_allowed(key)
    record_login_failure(key)
    db.contact_messages.insert_one({
        "_id": str(uuid.uuid4()),
        **data.model_dump(),
        "status": "NEW",
        "created_at": datetime.utcnow(),
        "handled_by": None,
        "handled_at": None,
    })
    return {"message": "Message envoyé. Notre équipe vous répondra par email."}


@admin_router.get("/")
def list_contact_messages(
    status: Optional[str] = Query(None, pattern="^(NEW|HANDLED)$"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Database = Depends(get_db),
    _=Depends(require_admin),
):
    return paginate(db.contact_messages, {"status": status} if status else {}, [("created_at", -1)], page, size)


@admin_router.put("/{message_id}/handled")
def toggle_handled(message_id: str, db: Database = Depends(get_db), current_user: dict = Depends(require_admin)):
    msg = db.contact_messages.find_one({"_id": message_id})
    if not msg:
        raise HTTPException(status_code=404, detail="Message introuvable")
    handled = msg.get("status") != "HANDLED"
    db.contact_messages.update_one({"_id": message_id}, {"$set": {
        "status": "HANDLED" if handled else "NEW",
        "handled_by": current_user["id"] if handled else None,
        "handled_at": datetime.utcnow() if handled else None,
    }})
    return {"message": "Message marqué comme traité" if handled else "Message remis à traiter", "status": "HANDLED" if handled else "NEW"}
