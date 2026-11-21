"""Stockage des fichiers envoyés (photos de profil, pièces justificatives, portfolio).

Les fichiers sont enregistrés dans MongoDB (GridFS, bucket « uploads ») : ils survivent aux
redéploiements sur des hébergeurs sans disque persistant (Render gratuit, etc.).
Les URL gardent la forme /uploads/<dossier>/<nom> ; les anciens fichiers restés sur disque
(dossier UPLOAD_DIR) sont encore servis et peuvent être migrés avec migrate_uploads_to_gridfs.py.
"""
import os
import uuid
from typing import Optional, Tuple

import gridfs
from fastapi import UploadFile, HTTPException

from app.config import settings
from app.database import db

_bucket = gridfs.GridFSBucket(db, bucket_name="uploads")

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_DOCUMENT_TYPES = {"application/pdf", "image/jpeg", "image/png"}
ALLOWED_ALL_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_DOCUMENT_TYPES

EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
}


def _matches_signature(content_type: str, content: bytes) -> bool:
    if content_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if content_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/gif":
        return content[:6] in (b"GIF87a", b"GIF89a")
    if content_type == "image/webp":
        return content[:4] == b"RIFF" and content[8:12] == b"WEBP"
    if content_type == "application/pdf":
        return content.startswith(b"%PDF-")
    return False


async def save_upload_file(file: UploadFile, subfolder: str, allowed_types: set = ALLOWED_ALL_TYPES) -> str:
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non supporté. Types acceptés : {', '.join(allowed_types)}",
        )

    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"Fichier trop volumineux. Maximum : {settings.MAX_FILE_SIZE // 1024 // 1024} MB")

    if not _matches_signature(file.content_type, content):
        raise HTTPException(status_code=400, detail="Le contenu du fichier ne correspond pas à son type")

    ext = EXTENSIONS[file.content_type]
    key = f"{subfolder}/{uuid.uuid4().hex}.{ext}"
    _bucket.upload_from_stream(key, content, metadata={"content_type": file.content_type})
    return f"/uploads/{key}"


def _key_from_url(url: str) -> Optional[str]:
    """« /uploads/avatars/x.jpg » -> « avatars/x.jpg » (refuse les chemins douteux)."""
    if not url or not url.startswith("/uploads/"):
        return None
    key = url[len("/uploads/"):]
    if ".." in key or key.startswith("/") or "\\" in key:
        return None
    return key


def read_file(key: str) -> Optional[Tuple[bytes, str]]:
    """Contenu et type MIME d'un fichier, depuis GridFS puis, à défaut, depuis le disque."""
    if not key or ".." in key or key.startswith("/"):
        return None
    try:
        grid_out = _bucket.open_download_stream_by_name(key)
        return grid_out.read(), (grid_out.metadata or {}).get("content_type", "application/octet-stream")
    except gridfs.errors.NoFile:
        pass
    path = os.path.join(settings.UPLOAD_DIR, key)
    if os.path.isfile(path):
        ext = key.rsplit(".", 1)[-1].lower()
        mime = {v: k for k, v in EXTENSIONS.items()}.get(ext, "application/octet-stream")
        with open(path, "rb") as f:
            return f.read(), mime
    return None


async def save_profile_picture(file: UploadFile) -> str:
    return await save_upload_file(file, "avatars", ALLOWED_IMAGE_TYPES)


async def save_document(file: UploadFile) -> str:
    return await save_upload_file(file, "documents", ALLOWED_DOCUMENT_TYPES)


async def save_portfolio_file(file: UploadFile) -> str:
    return await save_upload_file(file, "portfolio", ALLOWED_ALL_TYPES)


def delete_file(url: str) -> bool:
    key = _key_from_url(url)
    if not key:
        return False
    deleted = False
    for f in db["uploads.files"].find({"filename": key}, {"_id": 1}):
        _bucket.delete(f["_id"])
        deleted = True
    path = os.path.join(settings.UPLOAD_DIR, key)
    if os.path.isfile(path):
        os.remove(path)
        deleted = True
    return deleted
