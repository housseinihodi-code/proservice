import re
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.database import get_db
from app.models.user import UserRole
from app.models.document import DocumentStatus
from app.models.mission import MissionStatus
from app.models.offer import OfferStatus
from app.models.transaction import TransactionStatus
from app.schemas.user import PaginatedUsers
from app.schemas.document import DocumentResponse
from app.utils.security import require_admin, hash_password
from app.utils.helpers import paginate, serialize_doc, to_user_public

router = APIRouter()

ADMIN_ROLES = (UserRole.ADMIN, UserRole.SUPER_ADMIN)


# ---------------------------------------------------------------- utilitaires

def _log(db: Database, admin: dict, action: str, target_type: str, target_id: str, details: str = "") -> None:
    """Journal des actions de l'équipe d'administration."""
    db.admin_logs.insert_one({
        "_id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "admin_name": f"{admin.get('first_name', '')} {admin.get('last_name', '')}".strip(),
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "details": details,
        "created_at": datetime.utcnow(),
    })


def _sum(db: Database, filter: dict, field: str) -> float:
    pipeline = [{"$match": filter}, {"$group": {"_id": None, "total": {"$sum": f"${field}"}}}]
    result = list(db.transactions.aggregate(pipeline))
    return result[0]["total"] if result else 0


def _users_by_id(db: Database, ids) -> dict:
    return {u["_id"]: u for u in db.users.find({"_id": {"$in": list(set(ids))}})}


def _with_parties(db: Database, missions: List[dict]) -> List[dict]:
    users = _users_by_id(db, [m["client_id"] for m in missions] + [m["professional_id"] for m in missions])
    for m in missions:
        m["client"] = to_user_public(users[m["client_id"]]) if m["client_id"] in users else None
        m["professional"] = to_user_public(users[m["professional_id"]]) if m["professional_id"] in users else None
    return missions


def _name_regex(search: str) -> list:
    term = re.escape(search)
    return [
        {"first_name": {"$regex": term, "$options": "i"}},
        {"last_name": {"$regex": term, "$options": "i"}},
        {"email": {"$regex": term, "$options": "i"}},
    ]


# ---------------------------------------------------------------- tableau de bord

@router.get("/dashboard")
def dashboard_stats(db: Database = Depends(get_db), _=Depends(require_admin)):
    completed_txn_filter = {"status": TransactionStatus.COMPLETED}
    week_ago = datetime.utcnow() - timedelta(days=7)
    escrow = list(db.missions.aggregate([
        {"$match": {"payment_status": "IN_ESCROW"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]))
    recent_users = [
        serialize_doc(u) for u in db.users.find({}, {"password_hash": 0}).sort("created_at", -1).limit(6)
    ]
    return {
        "users": {
            "total": db.users.count_documents({}),
            "professionals": db.users.count_documents({"role": UserRole.PROFESSIONAL}),
            "clients": db.users.count_documents({"role": UserRole.CLIENT}),
            "admins": db.users.count_documents({"role": {"$in": list(ADMIN_ROLES)}}),
            "verified": db.users.count_documents({"is_verified": True}),
            "suspended": db.users.count_documents({"is_active": False}),
            "new_this_week": db.users.count_documents({"created_at": {"$gte": week_ago}}),
        },
        "missions": {
            "total": db.missions.count_documents({}),
            "pending": db.missions.count_documents({"mission_status": MissionStatus.PENDING}),
            "in_progress": db.missions.count_documents({"mission_status": MissionStatus.IN_PROGRESS}),
            "completed": db.missions.count_documents({"mission_status": MissionStatus.COMPLETED}),
            "disputed": db.missions.count_documents({"mission_status": MissionStatus.DISPUTED}),
            "escrow_amount": escrow[0]["total"] if escrow else 0,
        },
        "offers": {
            "total": db.offers.count_documents({}),
            "open": db.offers.count_documents({"status": OfferStatus.OPEN}),
            "applications": db.applications.count_documents({}),
        },
        "transactions": {
            "total": db.transactions.count_documents({}),
            "completed": db.transactions.count_documents(completed_txn_filter),
            "total_amount": _sum(db, completed_txn_filter, "amount"),
            "total_commission": _sum(db, completed_txn_filter, "commission"),
        },
        "documents": {
            "pending": db.documents.count_documents({"validation_status": DocumentStatus.PENDING}),
            "approved": db.documents.count_documents({"validation_status": DocumentStatus.APPROVED}),
            "rejected": db.documents.count_documents({"validation_status": DocumentStatus.REJECTED}),
        },
        "evaluations": {
            "total": db.evaluations.count_documents({}),
            "flagged": db.evaluations.count_documents({"is_flagged": True, "is_hidden": {"$ne": True}}),
        },
        "trades": {
            "total": db.trades.count_documents({}),
            "active": db.trades.count_documents({"is_active": True}),
        },
        "contact": {"new": db.contact_messages.count_documents({"status": "NEW"})},
        "recent_users": recent_users,
    }


# ---------------------------------------------------------------- utilisateurs

@router.get("/users", response_model=PaginatedUsers)
def list_users(
    role: Optional[UserRole] = Query(None),
    is_active: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Database = Depends(get_db),
    _=Depends(require_admin),
):
    filter = {}
    if role:
        filter["role"] = role
    if is_active is not None:
        filter["is_active"] = is_active
    if search:
        filter["$or"] = _name_regex(search)
    return paginate(db.users, filter, sort=[("created_at", -1)], page=page, size=size)


@router.get("/users/{user_id}")
def user_detail(user_id: str, db: Database = Depends(get_db), _=Depends(require_admin)):
    user = db.users.find_one({"_id": user_id}, {"password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    as_party = {"$or": [{"client_id": user_id}, {"professional_id": user_id}]}
    wallet = db.wallets.find_one({"user_id": user_id})
    profile = db.professional_profiles.find_one({"user_id": user_id})
    return {
        "user": serialize_doc(user),
        "profile": serialize_doc(profile) if profile else None,
        "wallet_balance": wallet["balance"] if wallet else 0,
        "missions": [serialize_doc(m) for m in db.missions.find(as_party).sort("created_at", -1).limit(10)],
        "missions_count": db.missions.count_documents(as_party),
        "offers_count": db.offers.count_documents({"client_id": user_id}),
        "evaluations_received": db.evaluations.count_documents({"target_id": user_id}),
    }


def _guard_target(current: dict, target: dict) -> None:
    if target["_id"] == current["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre compte ici")
    if target["role"] == UserRole.SUPER_ADMIN and current["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Seul un Super Admin peut agir sur un Super Admin")


@router.put("/users/{user_id}/toggle-active")
def toggle_user_active(user_id: str, db: Database = Depends(get_db), current_user: dict = Depends(require_admin)):
    user = db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    _guard_target(current_user, user)
    new_state = not user["is_active"]
    db.users.update_one({"_id": user_id}, {"$set": {"is_active": new_state, "updated_at": datetime.utcnow()}})
    _log(db, current_user, "ACTIVATE_USER" if new_state else "SUSPEND_USER", "user", user_id, user["email"])
    return {"message": f"Compte {'activé' if new_state else 'suspendu'}", "is_active": new_state}


@router.put("/users/{user_id}/verify")
def toggle_user_verified(user_id: str, db: Database = Depends(get_db), current_user: dict = Depends(require_admin)):
    user = db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    new_state = not user.get("is_verified", False)
    db.users.update_one({"_id": user_id}, {"$set": {"is_verified": new_state, "updated_at": datetime.utcnow()}})
    _log(db, current_user, "VERIFY_USER" if new_state else "UNVERIFY_USER", "user", user_id, user["email"])
    return {"message": "Profil vérifié" if new_state else "Vérification retirée", "is_verified": new_state}


@router.put("/users/{user_id}/role")
def change_user_role(
    user_id: str,
    role: UserRole,
    db: Database = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Seul le Super Admin peut modifier les rôles")
    user = db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas modifier votre propre rôle")

    db.users.update_one({"_id": user_id}, {"$set": {"role": role, "updated_at": datetime.utcnow()}})
    if role == UserRole.PROFESSIONAL and not db.professional_profiles.find_one({"user_id": user_id}):
        from app.services.auth_service import new_professional_profile
        db.professional_profiles.insert_one(new_professional_profile(user_id))
    _log(db, current_user, "CHANGE_ROLE", "user", user_id, f"{user['email']} : {user['role']} → {role.value}")
    return {"message": f"Rôle mis à jour : {role.value}"}


# ---------------------------------------------------------------- équipe d'administration

class TeamMemberCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(..., min_length=2, max_length=100)
    last_name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8)
    role: UserRole = UserRole.ADMIN

    @field_validator("email")
    @classmethod
    def lower_email(cls, v):
        return v.strip().lower()


@router.get("/team")
def list_team(db: Database = Depends(get_db), _=Depends(require_admin)):
    members = db.users.find({"role": {"$in": list(ADMIN_ROLES)}}, {"password_hash": 0}).sort("created_at", 1)
    return [serialize_doc(m) for m in members]


@router.post("/team", status_code=201)
def create_team_member(data: TeamMemberCreate, db: Database = Depends(get_db), current_user: dict = Depends(require_admin)):
    if current_user["role"] != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Seul un Super Admin peut ajouter un administrateur")
    if data.role not in ADMIN_ROLES:
        raise HTTPException(status_code=400, detail="Rôle d'administration attendu (ADMIN ou SUPER_ADMIN)")
    # Mêmes règles de robustesse que l'inscription publique.
    if not any(c.isupper() for c in data.password) or not any(c.isdigit() for c in data.password):
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir une majuscule et un chiffre")

    now = datetime.utcnow()
    user = {
        "_id": str(uuid.uuid4()),
        "email": data.email,
        "phone": None,
        "password_hash": hash_password(data.password),
        "first_name": data.first_name,
        "last_name": data.last_name,
        "role": data.role,
        "is_active": True,
        "is_verified": True,
        "profile_picture_url": None,
        "country": "FR",
        "region": None,
        "city": None,
        "created_at": now,
        "updated_at": now,
    }
    try:
        db.users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Un compte avec cet email existe déjà")
    _log(db, current_user, "ADD_ADMIN", "user", user["_id"], f"{data.email} ({data.role.value})")
    user.pop("password_hash")
    return serialize_doc(user)


@router.get("/logs")
def admin_logs(
    page: int = Query(1, ge=1),
    size: int = Query(30, ge=1, le=100),
    db: Database = Depends(get_db),
    _=Depends(require_admin),
):
    return paginate(db.admin_logs, {}, sort=[("created_at", -1)], page=page, size=size)


# ---------------------------------------------------------------- professionnels

@router.get("/professionals")
def list_professionals_admin(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Database = Depends(get_db),
    _=Depends(require_admin),
):
    user_filter = {"role": UserRole.PROFESSIONAL}
    if search:
        user_filter["$or"] = _name_regex(search)
    users = {u["_id"]: u for u in db.users.find(user_filter, {"password_hash": 0})}
    result = paginate(
        db.professional_profiles, {"user_id": {"$in": list(users)}},
        sort=[("is_featured", -1), ("reputation_score", -1)], page=page, size=size,
    )
    pending = {
        r["_id"]: r["n"] for r in db.documents.aggregate([
            {"$match": {"validation_status": DocumentStatus.PENDING}},
            {"$group": {"_id": "$professional_id", "n": {"$sum": 1}}},
        ])
    }
    for p in result["items"]:
        u = users.get(p["user_id"])
        p["user"] = serialize_doc(u) if u else None
        p["pending_documents"] = pending.get(p["id"], 0) + pending.get(p["user_id"], 0)
    return result


@router.put("/professionals/{profile_id}/featured")
def toggle_featured(profile_id: str, db: Database = Depends(get_db), current_user: dict = Depends(require_admin)):
    profile = db.professional_profiles.find_one({"_id": profile_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profil introuvable")
    new_state = not profile.get("is_featured", False)
    db.professional_profiles.update_one({"_id": profile_id}, {"$set": {"is_featured": new_state}})
    _log(db, current_user, "FEATURE_PRO" if new_state else "UNFEATURE_PRO", "profile", profile_id)
    return {"message": f"Profil {'mis en avant' if new_state else 'retiré de la mise en avant'}", "is_featured": new_state}


# ---------------------------------------------------------------- documents

@router.get("/documents/pending", response_model=List[DocumentResponse])
def pending_documents(db: Database = Depends(get_db), _=Depends(require_admin)):
    docs = db.documents.find({"validation_status": DocumentStatus.PENDING}).sort("created_at", 1)
    return [serialize_doc(d) for d in docs]


# ---------------------------------------------------------------- offres

@router.get("/offers")
def list_offers_admin(
    status: Optional[OfferStatus] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Database = Depends(get_db),
    _=Depends(require_admin),
):
    filter = {}
    if status:
        filter["status"] = status
    if search:
        filter["title"] = {"$regex": re.escape(search), "$options": "i"}
    result = paginate(db.offers, filter, sort=[("created_at", -1)], page=page, size=size)
    users = _users_by_id(db, [o["client_id"] for o in result["items"]])
    for o in result["items"]:
        o["client"] = to_user_public(users[o["client_id"]]) if o["client_id"] in users else None
        o["applications_count"] = db.applications.count_documents({"offer_id": o["id"]})
    return result


@router.post("/offers/{offer_id}/close")
def close_offer_admin(offer_id: str, db: Database = Depends(get_db), current_user: dict = Depends(require_admin)):
    offer = db.offers.find_one({"_id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="Offre introuvable")
    db.offers.update_one({"_id": offer_id}, {"$set": {"status": OfferStatus.CANCELLED, "updated_at": datetime.utcnow()}})
    _log(db, current_user, "CLOSE_OFFER", "offer", offer_id, offer["title"])
    return {"message": "Offre retirée"}


# ---------------------------------------------------------------- avis

@router.get("/evaluations/flagged")
def flagged_evaluations(db: Database = Depends(get_db), _=Depends(require_admin)):
    evaluations = [
        serialize_doc(e)
        for e in db.evaluations.find({"is_flagged": True, "is_hidden": {"$ne": True}}).sort("created_at", -1)
    ]
    users = _users_by_id(db, [e["author_id"] for e in evaluations] + [e["target_id"] for e in evaluations])
    for e in evaluations:
        e["author"] = to_user_public(users[e["author_id"]]) if e["author_id"] in users else None
        e["target"] = to_user_public(users[e["target_id"]]) if e["target_id"] in users else None
    return evaluations


@router.post("/evaluations/{evaluation_id}/moderate")
def moderate_evaluation(
    evaluation_id: str,
    hide: bool,
    db: Database = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    evaluation = db.evaluations.find_one({"_id": evaluation_id})
    if not evaluation:
        raise HTTPException(status_code=404, detail="Évaluation introuvable")
    db.evaluations.update_one(
        {"_id": evaluation_id},
        {"$set": {"is_hidden": hide, "is_flagged": False}},
    )
    from app.routers.evaluations import _update_reputation
    _update_reputation(db, evaluation["target_id"])
    _log(db, current_user, "HIDE_REVIEW" if hide else "KEEP_REVIEW", "evaluation", evaluation_id)
    return {"message": "Avis masqué" if hide else "Signalement rejeté"}


# ---------------------------------------------------------------- missions & litiges

@router.get("/missions")
def list_missions_admin(
    status: Optional[MissionStatus] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Database = Depends(get_db),
    _=Depends(require_admin),
):
    filter = {}
    if status:
        filter["mission_status"] = status
    if search:
        filter["title"] = {"$regex": re.escape(search), "$options": "i"}
    result = paginate(db.missions, filter, sort=[("updated_at", -1)], page=page, size=size)
    _with_parties(db, result["items"])
    return result


@router.get("/missions/disputed")
def disputed_missions(db: Database = Depends(get_db), _=Depends(require_admin)):
    missions = [serialize_doc(m) for m in db.missions.find({"mission_status": MissionStatus.DISPUTED}).sort("updated_at", 1)]
    return _with_parties(db, missions)


@router.post("/missions/{mission_id}/resolve-dispute")
def resolve_dispute(
    mission_id: str,
    favor_client: bool,
    db: Database = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    from app.services.escrow_service import release_to_professional, refund_to_client, close_offer
    mission = db.missions.find_one({"_id": mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    if mission["mission_status"] != MissionStatus.DISPUTED:
        raise HTTPException(status_code=400, detail="Cette mission n'est pas en litige")

    extra = {"dispute_resolution": "CLIENT" if favor_client else "PROFESSIONAL", "resolved_at": datetime.utcnow()}
    _log(db, current_user, "RESOLVE_DISPUTE", "mission", mission_id,
         f"{mission['title']} — en faveur du {'client' if favor_client else 'professionnel'}")
    if favor_client:
        if not refund_to_client(db, mission):
            db.missions.update_one({"_id": mission_id}, {"$set": {"mission_status": MissionStatus.CANCELLED}})
        close_offer(db, mission)
        db.missions.update_one({"_id": mission_id}, {"$set": extra})
        return {"message": "Litige tranché en faveur du client (remboursé sur son portefeuille)"}

    if not release_to_professional(db, mission, extra):
        db.missions.update_one(
            {"_id": mission_id},
            {"$set": {"mission_status": MissionStatus.COMPLETED, "updated_at": datetime.utcnow(), **extra}},
        )
    return {"message": "Litige tranché en faveur du professionnel (paiement versé)"}
