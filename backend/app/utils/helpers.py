import uuid
import os
import re
from decimal import Decimal
from app.config import settings


def generate_uuid() -> str:
    return str(uuid.uuid4())


def calculate_commission(amount: float) -> float:
    if amount < settings.COMMISSION_THRESHOLD_SMALL:
        rate = settings.COMMISSION_RATE_SMALL
    elif amount <= settings.COMMISSION_THRESHOLD_LARGE:
        rate = settings.COMMISSION_RATE_MEDIUM
    else:
        rate = settings.COMMISSION_RATE_LARGE
    return round(amount * rate, 2)


def calculate_net_amount(amount: float, commission: float) -> float:
    return round(amount - commission, 2)


def format_money(amount: float) -> str:
    return f"{amount:,.2f} €".replace(",", " ").replace(".", ",")


def validate_phone(phone: str) -> bool:
    """Numéro international au format E.164 (ex. +33612345678)."""
    return bool(re.match(r"^\+?[1-9]\d{6,14}$", re.sub(r"[\s.\-()]", "", phone)))


def allowed_file(filename: str, allowed_extensions: set) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_extensions


def get_upload_path(subfolder: str, filename: str) -> str:
    path = os.path.join(settings.UPLOAD_DIR, subfolder)
    os.makedirs(path, exist_ok=True)
    return os.path.join(path, filename)


def serialize_doc(doc: dict) -> dict:
    if doc is None:
        return None
    doc = dict(doc)
    doc["id"] = doc.pop("_id")
    return doc


USER_PUBLIC_FIELDS = (
    "id", "first_name", "last_name", "role", "is_verified",
    "profile_picture_url", "country", "region", "city", "created_at",
)


def to_user_public(user_doc: dict) -> dict:
    doc = serialize_doc(user_doc)
    return {field: doc.get(field) for field in USER_PUBLIC_FIELDS}


def paginate(collection, filter: dict, sort: list = None, page: int = 1, size: int = 20):
    total = collection.count_documents(filter)
    cursor = collection.find(filter)
    if sort:
        cursor = cursor.sort(sort)
    items = [serialize_doc(doc) for doc in cursor.skip((page - 1) * size).limit(size)]
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }
