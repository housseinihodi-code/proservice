import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from pymongo.database import Database
from typing import List, Optional

from app.database import get_db
from app.schemas.message import MessageCreate, MessageResponse, PaginatedMessages
from app.utils.security import get_current_user
from app.utils.helpers import paginate, serialize_doc, to_user_public
from app.services.file_service import save_portfolio_file

router = APIRouter()


def _attach_parties(db: Database, messages: List[dict]) -> List[dict]:
    user_ids = {m["sender_id"] for m in messages} | {m["receiver_id"] for m in messages}
    users = {u["_id"]: u for u in db.users.find({"_id": {"$in": list(user_ids)}})}
    for m in messages:
        m["sender"] = to_user_public(users[m["sender_id"]]) if m["sender_id"] in users else None
        m["receiver"] = to_user_public(users[m["receiver_id"]]) if m["receiver_id"] in users else None
    return messages


@router.get("/conversations")
def get_conversations(db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    uid = current_user["id"]

    messages = list(
        db.messages.find({"$or": [{"sender_id": uid}, {"receiver_id": uid}]}).sort("created_at", -1)
    )

    seen = set()
    conversations = []
    for msg in messages:
        other_id = str(msg["receiver_id"]) if str(msg["sender_id"]) == str(uid) else str(msg["sender_id"])
        if other_id not in seen:
            seen.add(other_id)
            other_user = db.users.find_one({"_id": other_id})
            unread = db.messages.count_documents({
                "sender_id": other_id,
                "receiver_id": uid,
                "is_read": False,
            })
            conversations.append({
                "user": to_user_public(other_user) if other_user else None,
                "last_message": serialize_doc(msg),
                "unread_count": unread,
            })
    return conversations


@router.get("/with/{other_user_id}", response_model=PaginatedMessages)
def get_conversation(
    other_user_id: str,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["id"]
    filter = {
        "$or": [
            {"sender_id": uid, "receiver_id": other_user_id},
            {"sender_id": other_user_id, "receiver_id": uid},
        ]
    }

    db.messages.update_many(
        {"sender_id": other_user_id, "receiver_id": uid, "is_read": False},
        {"$set": {"is_read": True}},
    )

    result = paginate(db.messages, filter, sort=[("created_at", -1)], page=page, size=size)
    result["items"] = _attach_parties(db, result["items"])
    return result


@router.post("/", response_model=MessageResponse, status_code=201)
def send_message(
    data: MessageCreate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if str(data.receiver_id) == str(current_user["id"]):
        raise HTTPException(status_code=400, detail="Impossible de s'envoyer un message à soi-même")

    receiver = db.users.find_one({"_id": data.receiver_id})
    if not receiver:
        raise HTTPException(status_code=404, detail="Destinataire introuvable")

    msg = {
        "_id": str(uuid.uuid4()),
        "sender_id": current_user["id"],
        "receiver_id": data.receiver_id,
        "mission_id": data.mission_id,
        "content": data.content,
        "file_url": None,
        "file_name": None,
        "is_read": False,
        "created_at": datetime.utcnow(),
    }
    db.messages.insert_one(msg)
    result = serialize_doc(msg)
    _attach_parties(db, [result])
    return result


@router.post("/upload", response_model=MessageResponse, status_code=201)
async def send_file_message(
    receiver_id: str,
    file: UploadFile = File(...),
    mission_id: Optional[str] = None,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    file_url = await save_portfolio_file(file)
    msg = {
        "_id": str(uuid.uuid4()),
        "sender_id": current_user["id"],
        "receiver_id": receiver_id,
        "mission_id": mission_id,
        "content": f"Fichier partagé : {file.filename}",
        "file_url": file_url,
        "file_name": file.filename,
        "is_read": False,
        "created_at": datetime.utcnow(),
    }
    db.messages.insert_one(msg)
    result = serialize_doc(msg)
    _attach_parties(db, [result])
    return result


@router.get("/unread-count")
def get_unread_count(db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    count = db.messages.count_documents({"receiver_id": current_user["id"], "is_read": False})
    return {"unread_count": count}
