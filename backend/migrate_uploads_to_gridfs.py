"""Copie les fichiers du dossier uploads/ (ancien stockage sur disque) dans MongoDB (GridFS).

À lancer une fois, depuis le dossier backend, vers la base visée par MONGO_URI / MONGO_DB_NAME :
    python migrate_uploads_to_gridfs.py

Les fichiers déjà présents dans GridFS sont ignorés : le script peut être relancé sans risque.
"""
import os

from app.config import settings
from app.database import db
from app.services.file_service import EXTENSIONS, _bucket

MIME = {ext: mime for mime, ext in EXTENSIONS.items()}


def main() -> None:
    copied = skipped = 0
    for folder in ("avatars", "documents", "portfolio"):
        root = os.path.join(settings.UPLOAD_DIR, folder)
        if not os.path.isdir(root):
            continue
        for name in sorted(os.listdir(root)):
            path = os.path.join(root, name)
            if not os.path.isfile(path):
                continue
            key = f"{folder}/{name}"
            if db["uploads.files"].find_one({"filename": key}, {"_id": 1}):
                skipped += 1
                continue
            with open(path, "rb") as f:
                _bucket.upload_from_stream(key, f.read(), metadata={"content_type": MIME.get(name.rsplit(".", 1)[-1].lower(), "application/octet-stream")})
            copied += 1
            print("copié :", key)
    print(f"\n{copied} fichier(s) copié(s), {skipped} déjà présent(s) — base « {settings.MONGO_DB_NAME} »")


if __name__ == "__main__":
    main()
