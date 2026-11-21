import re
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from pymongo.database import Database
from typing import Optional

from app.database import get_db
from app.models.user import UserRole
from app.schemas.professional import (
    ProfessionalProfileUpdate,
    ProfessionalProfileResponse,
    PaginatedProfessionals,
)
from app.utils.security import get_current_user
from app.utils.helpers import serialize_doc, to_user_public

router = APIRouter()


def _to_search_result(profile: dict, user: Optional[dict]) -> dict:
    return {
        "id": profile["_id"],
        "user": to_user_public(user) if user else None,
        "bio": profile.get("bio"),
        "years_experience": profile.get("years_experience", 0),
        "hourly_rate": profile.get("hourly_rate"),
        "fixed_rate": profile.get("fixed_rate"),
        "competence_domains": profile.get("competence_domains", []),
        "trades": profile.get("trades", []),
        "skills": profile.get("skills", []),
        "reputation_score": profile.get("reputation_score", 0.0),
        "total_reviews": profile.get("total_reviews", 0),
        "is_featured": profile.get("is_featured", False),
        "badges": profile.get("badges", []),
    }


def _to_profile_response(profile: dict, user: Optional[dict]) -> dict:
    data = serialize_doc(profile)
    data["user"] = to_user_public(user) if user else None
    return data


@router.get("/", response_model=PaginatedProfessionals)
def list_professionals(
    domain: Optional[str] = Query(None),
    trade: Optional[str] = Query(None, description="Métier exact, ex. Plombier"),
    country: Optional[str] = Query(None, description="Code pays ISO, ex. FR"),
    region: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    min_rate: Optional[float] = Query(None),
    max_rate: Optional[float] = Query(None),
    min_rating: Optional[float] = Query(None),
    skill: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Database = Depends(get_db),
):
    user_filter = {"is_active": True}
    if country:
        user_filter["country"] = country.upper()
    if region:
        user_filter["region"] = {"$regex": re.escape(region), "$options": "i"}
    if city:
        user_filter["city"] = {"$regex": re.escape(city), "$options": "i"}

    user_ids = [u["_id"] for u in db.users.find(user_filter, {"_id": 1})]

    profile_filter = {"user_id": {"$in": user_ids}}
    if min_rate is not None:
        profile_filter.setdefault("hourly_rate", {})["$gte"] = min_rate
    if max_rate is not None:
        profile_filter.setdefault("hourly_rate", {})["$lte"] = max_rate
    if min_rating is not None:
        profile_filter["reputation_score"] = {"$gte": min_rating}
    if skill:
        profile_filter["skills"] = skill
    if domain:
        profile_filter["competence_domains"] = domain
    if trade:
        profile_filter["trades"] = trade

    profiles = list(db.professional_profiles.find(profile_filter))
    users = {u["_id"]: u for u in db.users.find({"_id": {"$in": [p["user_id"] for p in profiles]}})}

    if search:
        term = search.lower()
        profiles = [
            p for p in profiles
            if term in (users.get(p["user_id"], {}).get("first_name") or "").lower()
            or term in (users.get(p["user_id"], {}).get("last_name") or "").lower()
            or term in (p.get("bio") or "").lower()
            or any(term in s.lower() for s in p.get("skills", []))
            or any(term in d.lower() for d in p.get("competence_domains", []))
            or any(term in t.lower() for t in p.get("trades", []))
        ]

    profiles.sort(key=lambda p: (p.get("is_featured", False), p.get("reputation_score", 0.0)), reverse=True)

    total = len(profiles)
    start = (page - 1) * size
    page_items = profiles[start:start + size]
    items = [_to_search_result(p, users.get(p["user_id"])) for p in page_items]

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size,
    }


@router.get("/{profile_id}", response_model=ProfessionalProfileResponse)
def get_professional(profile_id: str, db: Database = Depends(get_db)):
    profile = db.professional_profiles.find_one({"_id": profile_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profil professionnel introuvable")
    user = db.users.find_one({"_id": profile["user_id"]})
    return _to_profile_response(profile, user)


@router.get("/user/{user_id}", response_model=ProfessionalProfileResponse)
def get_professional_by_user(user_id: str, db: Database = Depends(get_db)):
    profile = db.professional_profiles.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profil professionnel introuvable")
    user = db.users.find_one({"_id": profile["user_id"]})
    return _to_profile_response(profile, user)


@router.put("/me", response_model=ProfessionalProfileResponse)
def update_my_profile(
    data: ProfessionalProfileUpdate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != UserRole.PROFESSIONAL:
        raise HTTPException(status_code=403, detail="Réservé aux professionnels")

    profile = db.professional_profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        raise HTTPException(status_code=404, detail="Profil introuvable")

    updates = data.model_dump(exclude_none=True)
    if "trades" in updates:
        from app.routers.trades import active_trade_names
        unknown = set(updates["trades"]) - active_trade_names(db)
        if unknown:
            raise HTTPException(status_code=400, detail=f"Métier inconnu : {', '.join(sorted(unknown))}")
        updates["trades"] = list(dict.fromkeys(updates["trades"]))
    if updates:
        updates["updated_at"] = datetime.utcnow()
        db.professional_profiles.update_one({"_id": profile["_id"]}, {"$set": updates})
        profile = db.professional_profiles.find_one({"_id": profile["_id"]})

    user = db.users.find_one({"_id": current_user["id"]})
    return _to_profile_response(profile, user)
