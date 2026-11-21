import re
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from pymongo.database import Database
from typing import List, Optional

from app.database import get_db
from app.models.user import UserRole
from app.models.offer import OfferStatus
from app.schemas.offer import OfferCreate, OfferUpdate, OfferResponse, ApplicationCreate, ApplicationResponse, PaginatedOffers
from app.utils.security import get_current_user
from app.utils.helpers import paginate, serialize_doc, to_user_public

router = APIRouter()


@router.get("/", response_model=PaginatedOffers)
def list_offers(
    domain: Optional[str] = Query(None),
    trade: Optional[str] = Query(None),
    country: Optional[str] = Query(None, description="Code pays ISO, ex. FR"),
    region: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    status: Optional[OfferStatus] = Query(OfferStatus.OPEN),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Database = Depends(get_db),
):
    filter = {}
    if status:
        filter["status"] = status
    if domain:
        filter["domain"] = {"$regex": re.escape(domain), "$options": "i"}
    if trade:
        filter["trade"] = trade
    if country:
        filter["location_country"] = country.upper()
    if region:
        filter["location_region"] = {"$regex": re.escape(region), "$options": "i"}
    if city:
        filter["location_city"] = {"$regex": re.escape(city), "$options": "i"}
    if search:
        search = re.escape(search)
        filter["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"trade": {"$regex": search, "$options": "i"}},
        ]

    result = paginate(db.offers, filter, sort=[("created_at", -1)], page=page, size=size)
    _enrich_offers(db, result["items"])
    return result


def _enrich_offers(db: Database, offers: List[dict]) -> List[dict]:
    client_ids = {offer["client_id"] for offer in offers}
    clients = {u["_id"]: u for u in db.users.find({"_id": {"$in": list(client_ids)}})}
    for offer in offers:
        offer["client"] = to_user_public(clients[offer["client_id"]]) if offer["client_id"] in clients else None
        offer["applications_count"] = db.applications.count_documents({"offer_id": offer["id"]})
    return offers


def _check_trade(db: Database, trade: Optional[str]) -> None:
    if trade and not db.trades.find_one({"name": trade, "is_active": True}):
        raise HTTPException(status_code=400, detail="Métier inconnu")


@router.get("/mine", response_model=PaginatedOffers)
def my_offers(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Toutes les offres publiées par le client connecté, quel que soit leur statut."""
    result = paginate(db.offers, {"client_id": current_user["id"]}, sort=[("created_at", -1)], page=page, size=size)
    _enrich_offers(db, result["items"])
    return result


@router.get("/applications/me", response_model=List[ApplicationResponse])
def my_applications(db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Candidatures envoyées par le professionnel connecté, avec l'offre associée."""
    if current_user["role"] != UserRole.PROFESSIONAL:
        raise HTTPException(status_code=403, detail="Réservé aux professionnels")
    profile = db.professional_profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        return []
    applications = [serialize_doc(a) for a in db.applications.find({"professional_id": profile["_id"]}).sort("created_at", -1)]
    offers = {o["_id"]: serialize_doc(o) for o in db.offers.find({"_id": {"$in": [a["offer_id"] for a in applications]}})}
    _enrich_offers(db, list(offers.values()))
    for a in applications:
        a["professional_user_id"] = current_user["id"]
        a["offer"] = offers.get(a["offer_id"])
    return applications


@router.post("/", response_model=OfferResponse, status_code=201)
def create_offer(data: OfferCreate, db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in (UserRole.CLIENT, UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(status_code=403, detail="Seuls les clients peuvent publier des offres")
    _check_trade(db, data.trade)

    now = datetime.utcnow()
    offer = {
        "_id": str(uuid.uuid4()),
        "client_id": current_user["id"],
        "status": OfferStatus.OPEN,
        "views_count": 0,
        "created_at": now,
        "updated_at": now,
        **data.model_dump(),
    }
    db.offers.insert_one(offer)
    result = serialize_doc(offer)
    result["client"] = to_user_public(db.users.find_one({"_id": current_user["id"]}))
    result["applications_count"] = 0
    return result


@router.get("/{offer_id}", response_model=OfferResponse)
def get_offer(offer_id: str, db: Database = Depends(get_db)):
    offer = db.offers.find_one({"_id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    db.offers.update_one({"_id": offer_id}, {"$inc": {"views_count": 1}})
    offer["views_count"] = offer.get("views_count", 0) + 1
    result = serialize_doc(offer)
    result["client"] = to_user_public(db.users.find_one({"_id": offer["client_id"]}))
    result["applications_count"] = db.applications.count_documents({"offer_id": offer_id})
    return result


@router.put("/{offer_id}", response_model=OfferResponse)
def update_offer(
    offer_id: str,
    data: OfferUpdate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    offer = db.offers.find_one({"_id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    if str(offer["client_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Non autorisé")

    updates = data.model_dump(exclude_none=True)
    _check_trade(db, updates.get("trade"))
    if updates:
        updates["updated_at"] = datetime.utcnow()
        db.offers.update_one({"_id": offer_id}, {"$set": updates})
        offer = db.offers.find_one({"_id": offer_id})

    result = serialize_doc(offer)
    result["client"] = to_user_public(db.users.find_one({"_id": offer["client_id"]}))
    result["applications_count"] = db.applications.count_documents({"offer_id": offer_id})
    return result


@router.delete("/{offer_id}", status_code=204)
def delete_offer(offer_id: str, db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    offer = db.offers.find_one({"_id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    if str(offer["client_id"]) != str(current_user["id"]) and current_user["role"] not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(status_code=403, detail="Non autorisé")
    db.applications.delete_many({"offer_id": offer_id})
    db.offers.delete_one({"_id": offer_id})


@router.post("/{offer_id}/apply", response_model=ApplicationResponse, status_code=201)
def apply_to_offer(
    offer_id: str,
    data: ApplicationCreate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] != UserRole.PROFESSIONAL:
        raise HTTPException(status_code=403, detail="Seuls les professionnels peuvent postuler")

    offer = db.offers.find_one({"_id": offer_id, "status": OfferStatus.OPEN})
    if not offer:
        raise HTTPException(status_code=404, detail="Offre introuvable ou fermée")

    profile = db.professional_profiles.find_one({"user_id": current_user["id"]})
    if not profile:
        raise HTTPException(status_code=400, detail="Profil professionnel requis")

    existing = db.applications.find_one({"offer_id": offer_id, "professional_id": profile["_id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà postulé à cette offre")

    now = datetime.utcnow()
    application = {
        "_id": str(uuid.uuid4()),
        "offer_id": offer_id,
        "professional_id": profile["_id"],
        "status": "PENDING",
        "created_at": now,
        "updated_at": now,
        **data.model_dump(),
    }
    db.applications.insert_one(application)
    return serialize_doc(application)


@router.get("/{offer_id}/applications", response_model=List[ApplicationResponse])
def get_offer_applications(
    offer_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    offer = db.offers.find_one({"_id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    if str(offer["client_id"]) != str(current_user["id"]) and current_user["role"] not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(status_code=403, detail="Non autorisé")

    applications = [serialize_doc(a) for a in db.applications.find({"offer_id": offer_id}).sort("created_at", -1)]
    profile_ids = {a["professional_id"] for a in applications}
    profiles = {p["_id"]: p for p in db.professional_profiles.find({"_id": {"$in": list(profile_ids)}})}
    user_ids = {p["user_id"] for p in profiles.values()}
    users = {u["_id"]: u for u in db.users.find({"_id": {"$in": list(user_ids)}})}
    for a in applications:
        profile = profiles.get(a["professional_id"])
        user = users.get(profile["user_id"]) if profile else None
        a["professional_user_id"] = profile["user_id"] if profile else None
        a["professional"] = to_user_public(user) if user else None
    return applications


@router.post("/{offer_id}/applications/{application_id}/accept", response_model=ApplicationResponse)
def accept_application(
    offer_id: str,
    application_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    offer = db.offers.find_one({"_id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    if str(offer["client_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Non autorisé")

    if offer["status"] != OfferStatus.OPEN:
        raise HTTPException(status_code=400, detail="Une candidature a déjà été acceptée pour cette offre")

    application = db.applications.find_one({"_id": application_id, "offer_id": offer_id})
    if not application:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    if application["status"] != "PENDING":
        raise HTTPException(status_code=400, detail="Cette candidature a déjà été traitée")

    now = datetime.utcnow()
    db.applications.update_one({"_id": application_id}, {"$set": {"status": "ACCEPTED", "updated_at": now}})
    db.applications.update_many(
        {"offer_id": offer_id, "_id": {"$ne": application_id}},
        {"$set": {"status": "REJECTED", "updated_at": now}},
    )
    db.offers.update_one({"_id": offer_id}, {"$set": {"status": OfferStatus.IN_PROGRESS, "updated_at": now}})

    application = db.applications.find_one({"_id": application_id})
    result = serialize_doc(application)
    profile = db.professional_profiles.find_one({"_id": application["professional_id"]})
    user = db.users.find_one({"_id": profile["user_id"]}) if profile else None
    result["professional_user_id"] = profile["user_id"] if profile else None
    result["professional"] = to_user_public(user) if user else None
    return result


@router.post("/{offer_id}/applications/{application_id}/reject", response_model=ApplicationResponse)
def reject_application(
    offer_id: str,
    application_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    offer = db.offers.find_one({"_id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    if str(offer["client_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Non autorisé")
    application = db.applications.find_one({"_id": application_id, "offer_id": offer_id})
    if not application:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    if application["status"] != "PENDING":
        raise HTTPException(status_code=400, detail="Cette candidature a déjà été traitée")
    db.applications.update_one({"_id": application_id}, {"$set": {"status": "REJECTED", "updated_at": datetime.utcnow()}})
    result = serialize_doc(db.applications.find_one({"_id": application_id}))
    profile = db.professional_profiles.find_one({"_id": application["professional_id"]})
    user = db.users.find_one({"_id": profile["user_id"]}) if profile else None
    result["professional_user_id"] = profile["user_id"] if profile else None
    result["professional"] = to_user_public(user) if user else None
    return result
