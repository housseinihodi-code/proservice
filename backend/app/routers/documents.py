import uuid
from datetime import datetime
import os
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from pymongo.database import Database
from typing import List

from app.config import settings
from app.database import get_db
from app.models.user import UserRole
from app.models.document import DocumentType, DocumentStatus
from app.schemas.document import DocumentResponse, DocumentValidation
from app.utils.security import get_current_user, require_admin
from app.utils.helpers import serialize_doc
from app.services.file_service import save_document, read_file

router = APIRouter()


@router.post("/", response_model=DocumentResponse, status_code=201)
async def upload_document(
    doc_type: DocumentType = Form(...),
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != UserRole.PROFESSIONAL:
        raise HTTPException(status_code=403, detail="Réservé aux professionnels")

    url = await save_document(file)
    doc = {
        "_id": str(uuid.uuid4()),
        "professional_id": current_user["id"],
        "type": doc_type,
        "name": name,
        "storage_url": url,
        "validation_status": DocumentStatus.PENDING,
        "validated_by": None,
        "validation_date": None,
        "rejection_reason": None,
        "created_at": datetime.utcnow(),
    }
    db.documents.insert_one(doc)
    return serialize_doc(doc)


@router.get("/my", response_model=List[DocumentResponse])
def my_documents(db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return [serialize_doc(d) for d in db.documents.find({"professional_id": current_user["id"]})]


@router.get("/{doc_id}/file")
def download_document(doc_id: str, db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    doc = db.documents.find_one({"_id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable")
    if str(doc["professional_id"]) != str(current_user["id"]) and current_user["role"] not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(status_code=403, detail="Non autorisé")
    filename = os.path.basename(doc.get("storage_url") or "")
    found = read_file(f"documents/{filename}") if filename else None
    if not found:
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    content, mime = found
    return Response(content, media_type=mime, headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})


@router.delete("/{doc_id}", status_code=204)
def delete_document(doc_id: str, db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    doc = db.documents.find_one({"_id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable")
    if str(doc["professional_id"]) != str(current_user["id"]) and current_user["role"] not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(status_code=403, detail="Non autorisé")
    from app.services.file_service import delete_file
    delete_file(doc["storage_url"])
    db.documents.delete_one({"_id": doc_id})


@router.put("/{doc_id}/validate", response_model=DocumentResponse)
def validate_document(
    doc_id: str,
    data: DocumentValidation,
    db: Database = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    doc = db.documents.find_one({"_id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document introuvable")

    updates = {
        "validation_status": data.status,
        "validated_by": current_user["id"],
        "validation_date": datetime.utcnow(),
    }
    if data.status == DocumentStatus.REJECTED:
        updates["rejection_reason"] = data.rejection_reason

    db.documents.update_one({"_id": doc_id}, {"$set": updates})

    if data.status == DocumentStatus.APPROVED:
        db.users.update_one({"_id": doc["professional_id"]}, {"$set": {"is_verified": True}})

    from app.routers.admin import _log
    _log(db, current_user, "APPROVE_DOC" if data.status == DocumentStatus.APPROVED else "REJECT_DOC", "document", doc_id, doc["name"])
    doc = db.documents.find_one({"_id": doc_id})

    owner = db.users.find_one({"_id": doc["professional_id"]})
    if owner:
        from app.services.email_service import send_document_validation_email
        approved = data.status == DocumentStatus.APPROVED
        send_document_validation_email(owner["email"], owner["first_name"], doc["name"], approved, data.rejection_reason)

    return serialize_doc(doc)
