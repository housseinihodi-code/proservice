import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from pymongo.database import Database
from typing import List, Optional

from app.database import get_db
from app.models.mission import MissionStatus, PaymentStatus
from app.models.transaction import TransactionStatus
from app.schemas.mission import MissionCreate, MissionUpdate, MissionResponse, ValidateDeliverable, PaginatedMissions, DeliverMission, DisputeMission
from app.services.escrow_service import release_to_professional, refund_to_client, close_offer
from app.utils.security import get_current_user
from app.utils.helpers import paginate, serialize_doc, to_user_public, calculate_commission, calculate_net_amount

router = APIRouter()


def _attach_parties(db: Database, missions: List[dict]) -> List[dict]:
    user_ids = {m["client_id"] for m in missions} | {m["professional_id"] for m in missions}
    users = {u["_id"]: u for u in db.users.find({"_id": {"$in": list(user_ids)}})}
    for m in missions:
        m["client"] = to_user_public(users[m["client_id"]]) if m["client_id"] in users else None
        m["professional"] = to_user_public(users[m["professional_id"]]) if m["professional_id"] in users else None
    return missions


def _attach_my_evaluation(db: Database, missions: List[dict], user_id: str) -> List[dict]:
    done = {
        e["mission_id"]
        for e in db.evaluations.find({"author_id": user_id, "mission_id": {"$in": [m["id"] for m in missions]}}, {"mission_id": 1})
    }
    for m in missions:
        m["has_my_evaluation"] = m["id"] in done
    return missions


def _get_for(db: Database, mission_id: str) -> dict:
    mission = db.missions.find_one({"_id": mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    return mission


def _response(db: Database, mission: dict, user_id: str) -> dict:
    result = serialize_doc(mission)
    _attach_parties(db, [result])
    _attach_my_evaluation(db, [result], user_id)
    return result


@router.get("/", response_model=PaginatedMissions)
def list_missions(
    status: Optional[MissionStatus] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    filter = {}
    if current_user["role"] == "CLIENT":
        filter["client_id"] = current_user["id"]
    elif current_user["role"] == "PROFESSIONAL":
        filter["professional_id"] = current_user["id"]
    if status:
        filter["mission_status"] = status

    result = paginate(db.missions, filter, sort=[("created_at", -1)], page=page, size=size)
    result["items"] = _attach_parties(db, result["items"])
    _attach_my_evaluation(db, result["items"], current_user["id"])
    return result


@router.post("/", response_model=MissionResponse, status_code=201)
def create_mission(
    data: MissionCreate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    if data.professional_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous confier une mission")
    pro = db.users.find_one({"_id": data.professional_id, "role": "PROFESSIONAL", "is_active": True})
    if not pro:
        raise HTTPException(status_code=404, detail="Professionnel introuvable")

    if data.offer_id:
        offer = db.offers.find_one({"_id": data.offer_id})
        if not offer or str(offer["client_id"]) != str(current_user["id"]):
            raise HTTPException(status_code=404, detail="Offre introuvable")
        profile = db.professional_profiles.find_one({"user_id": data.professional_id})
        accepted = profile and db.applications.find_one(
            {"offer_id": data.offer_id, "professional_id": profile["_id"], "status": "ACCEPTED"}
        )
        if not accepted:
            raise HTTPException(status_code=400, detail="Ce professionnel n'a pas été retenu pour cette offre")
        if db.missions.find_one({"offer_id": data.offer_id, "mission_status": {"$ne": MissionStatus.CANCELLED}}):
            raise HTTPException(status_code=400, detail="Une mission existe déjà pour cette offre")

    commission = calculate_commission(data.amount)
    net = calculate_net_amount(data.amount, commission)

    now = datetime.utcnow()
    mission = {
        "_id": str(uuid.uuid4()),
        "client_id": current_user["id"],
        "professional_id": data.professional_id,
        "offer_id": data.offer_id,
        "title": data.title,
        "description": data.description,
        "amount": data.amount,
        "commission_amount": commission,
        "net_amount": net,
        "start_date": None,
        "end_date": None,
        "deadline": data.deadline,
        "payment_status": PaymentStatus.PENDING,
        "mission_status": MissionStatus.PENDING,
        "deliverable_validated": False,
        "deliverable_url": None,
        "notes": None,
        "created_at": now,
        "updated_at": now,
    }
    db.missions.insert_one(mission)
    result = serialize_doc(mission)
    _attach_parties(db, [result])
    return result


@router.get("/{mission_id}", response_model=MissionResponse)
def get_mission(mission_id: str, db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    mission = db.missions.find_one({"_id": mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    if str(mission["client_id"]) != str(current_user["id"]) and str(mission["professional_id"]) != str(current_user["id"]) and current_user["role"] not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(status_code=403, detail="Non autorisé")
    return _response(db, mission, current_user["id"])


@router.put("/{mission_id}", response_model=MissionResponse)
def update_mission(
    mission_id: str,
    data: MissionUpdate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    mission = db.missions.find_one({"_id": mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    if str(mission["client_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Non autorisé")

    updates = data.model_dump(exclude_none=True)
    if updates:
        updates["updated_at"] = datetime.utcnow()
        db.missions.update_one({"_id": mission_id}, {"$set": updates})
        mission = db.missions.find_one({"_id": mission_id})

    result = serialize_doc(mission)
    _attach_parties(db, [result])
    return result


@router.post("/{mission_id}/accept")
def accept_mission(mission_id: str, db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    mission = db.missions.find_one({"_id": mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    if str(mission["professional_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Non autorisé")
    if mission["mission_status"] != MissionStatus.PENDING:
        raise HTTPException(status_code=400, detail="La mission ne peut pas être acceptée dans son état actuel")

    db.missions.update_one(
        {"_id": mission_id},
        {"$set": {"mission_status": MissionStatus.IN_PROGRESS, "start_date": datetime.utcnow(), "updated_at": datetime.utcnow()}},
    )
    return {"message": "Mission acceptée"}


@router.post("/{mission_id}/decline")
def decline_mission(mission_id: str, db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Le professionnel refuse une mission qui lui est proposée."""
    mission = _get_for(db, mission_id)
    if str(mission["professional_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Non autorisé")
    if mission["mission_status"] != MissionStatus.PENDING:
        raise HTTPException(status_code=400, detail="Seule une mission en attente peut être refusée")
    if not refund_to_client(db, mission):
        db.missions.update_one(
            {"_id": mission_id},
            {"$set": {"mission_status": MissionStatus.CANCELLED, "updated_at": datetime.utcnow()}},
        )
    close_offer(db, mission)
    return {"message": "Mission refusée"}


@router.post("/{mission_id}/deliver", response_model=MissionResponse)
def deliver_mission(
    mission_id: str,
    data: DeliverMission,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Le professionnel signale que le travail est livré ; le client doit ensuite valider."""
    mission = _get_for(db, mission_id)
    if str(mission["professional_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Seul le professionnel peut livrer")
    if mission["mission_status"] != MissionStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="La mission n'est pas en cours")
    now = datetime.utcnow()
    db.missions.update_one({"_id": mission_id}, {"$set": {
        "deliverable_url": data.deliverable_url,
        "delivery_note": data.delivery_note,
        "delivered_at": now,
        "updated_at": now,
    }})
    return _response(db, _get_for(db, mission_id), current_user["id"])


@router.post("/{mission_id}/validate-deliverable")
def validate_deliverable(
    mission_id: str,
    data: ValidateDeliverable,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    mission = _get_for(db, mission_id)
    if str(mission["client_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Seul le client peut valider")
    if mission["mission_status"] != MissionStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="La mission n'est pas en cours")

    if data.approved:
        if mission["payment_status"] != PaymentStatus.IN_ESCROW:
            raise HTTPException(status_code=400, detail="La mission doit être payée avant validation du livrable")
        if not release_to_professional(db, mission):
            raise HTTPException(status_code=409, detail="Le paiement a déjà été traité")
        return {"message": "Livrable validé, paiement versé au professionnel"}

    _open_dispute(db, mission, current_user["id"], data.notes or "Livrable refusé par le client")
    return {"message": "Litige ouvert"}


def _open_dispute(db: Database, mission: dict, user_id: str, reason: str) -> None:
    db.missions.update_one({"_id": mission["_id"]}, {"$set": {
        "mission_status": MissionStatus.DISPUTED,
        "dispute_reason": reason,
        "disputed_by": user_id,
        "notes": reason,
        "updated_at": datetime.utcnow(),
    }})


@router.post("/{mission_id}/dispute")
def open_dispute(
    mission_id: str,
    data: DisputeMission,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Le client ou le professionnel signale un désaccord ; un administrateur tranche."""
    mission = _get_for(db, mission_id)
    if current_user["id"] not in (str(mission["client_id"]), str(mission["professional_id"])):
        raise HTTPException(status_code=403, detail="Non autorisé")
    if mission["mission_status"] != MissionStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Seule une mission en cours peut faire l'objet d'un litige")
    _open_dispute(db, mission, current_user["id"], data.reason)
    return {"message": "Litige ouvert, un administrateur va l'examiner"}


@router.post("/{mission_id}/cancel")
def cancel_mission(mission_id: str, db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    mission = _get_for(db, mission_id)
    is_admin = current_user["role"] in ("ADMIN", "SUPER_ADMIN")
    if str(mission["client_id"]) != str(current_user["id"]) and not is_admin:
        raise HTTPException(status_code=403, detail="Non autorisé")
    if mission["mission_status"] in (MissionStatus.COMPLETED, MissionStatus.CANCELLED):
        raise HTTPException(status_code=400, detail="La mission est déjà terminée ou annulée")
    # Une fois la mission acceptée, le client ne peut plus annuler seul :
    # il doit ouvrir un litige pour protéger le travail du professionnel.
    if not is_admin and mission["mission_status"] != MissionStatus.PENDING:
        raise HTTPException(status_code=400, detail="Mission déjà commencée : ouvrez un litige plutôt que d'annuler")

    if not refund_to_client(db, mission):
        db.missions.update_one(
            {"_id": mission_id},
            {"$set": {"mission_status": MissionStatus.CANCELLED, "updated_at": datetime.utcnow()}},
        )
    close_offer(db, mission)
    return {"message": "Mission annulée"}
