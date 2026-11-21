from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.database import get_db
from app.schemas.user import UserResponse, UserPublic, UserUpdate, ChangePasswordRequest
from app.utils.helpers import serialize_doc, to_user_public
from app.utils.security import get_current_user, hash_password, verify_password
from app.services.file_service import save_profile_picture

router = APIRouter()


@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(data: UserUpdate, db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    updates = data.model_dump(exclude_none=True)
    if updates:
        # Vérification explicite (l'index unique reste la garantie en cas d'accès concurrent).
        if updates.get("phone") and db.users.find_one({"phone": updates["phone"], "_id": {"$ne": current_user["id"]}}):
            raise HTTPException(status_code=400, detail="Ce numéro de téléphone est déjà utilisé")
        updates["updated_at"] = datetime.utcnow()
        try:
            db.users.update_one({"_id": current_user["id"]}, {"$set": updates})
        except DuplicateKeyError:
            raise HTTPException(status_code=400, detail="Ce numéro de téléphone est déjà utilisé")
    user = db.users.find_one({"_id": current_user["id"]})
    return serialize_doc(user)


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    url = await save_profile_picture(file)
    db.users.update_one(
        {"_id": current_user["id"]},
        {"$set": {"profile_picture_url": url, "updated_at": datetime.utcnow()}},
    )
    user = db.users.find_one({"_id": current_user["id"]})
    return serialize_doc(user)


@router.put("/me/password")
def change_password(
    data: ChangePasswordRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    user = db.users.find_one({"_id": current_user["id"]})
    if not verify_password(data.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    db.users.update_one(
        {"_id": current_user["id"]},
        {"$set": {"password_hash": hash_password(data.new_password), "updated_at": datetime.utcnow()}},
    )
    return {"message": "Mot de passe modifié avec succès"}


@router.get("/{user_id}", response_model=UserPublic)
def get_user(user_id: str, db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user = db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return to_user_public(user)
