import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from pymongo.database import Database

from app.database import get_db
from app.models.mission import MissionStatus
from app.schemas.evaluation import EvaluationCreate, EvaluationResponse, EvaluationResponseUpdate, FlagEvaluation, PaginatedEvaluations
from app.utils.security import get_current_user
from app.utils.helpers import paginate, serialize_doc, to_user_public

router = APIRouter()


@router.post("/", response_model=EvaluationResponse, status_code=201)
def create_evaluation(
    data: EvaluationCreate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    mission = db.missions.find_one({"_id": data.mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    if mission["mission_status"] != MissionStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="La mission doit être terminée pour être évaluée")
    if str(mission["client_id"]) != str(current_user["id"]) and str(mission["professional_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Non autorisé")
    other_party = mission["professional_id"] if str(mission["client_id"]) == str(current_user["id"]) else mission["client_id"]
    if str(data.target_id) != str(other_party):
        raise HTTPException(status_code=400, detail="Vous ne pouvez évaluer que l'autre partie de la mission")

    existing = db.evaluations.find_one({"mission_id": data.mission_id, "author_id": current_user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Vous avez déjà évalué cette mission")

    evaluation = {
        "_id": str(uuid.uuid4()),
        "mission_id": data.mission_id,
        "author_id": current_user["id"],
        "target_id": data.target_id,
        "rating": data.rating,
        "comment": data.comment,
        "response": None,
        "is_flagged": False,
        "flag_reason": None,
        "created_at": datetime.utcnow(),
    }
    db.evaluations.insert_one(evaluation)

    _update_reputation(db, data.target_id)

    result = serialize_doc(evaluation)
    author = db.users.find_one({"_id": current_user["id"]})
    result["author"] = to_user_public(author) if author else None
    return result


def _update_reputation(db: Database, user_id: str):
    evaluations = list(db.evaluations.find({"target_id": user_id, "is_hidden": {"$ne": True}}))
    if evaluations:
        avg = sum(e["rating"] for e in evaluations) / len(evaluations)
        db.professional_profiles.update_one(
            {"user_id": user_id},
            {"$set": {"reputation_score": round(avg, 2), "total_reviews": len(evaluations), "updated_at": datetime.utcnow()}},
        )


@router.get("/user/{user_id}", response_model=PaginatedEvaluations)
def get_user_evaluations(
    user_id: str,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Database = Depends(get_db),
):
    result = paginate(
        db.evaluations,
        {"target_id": user_id, "is_hidden": {"$ne": True}},
        sort=[("created_at", -1)],
        page=page,
        size=size,
    )
    author_ids = {e["author_id"] for e in result["items"]}
    authors = {u["_id"]: u for u in db.users.find({"_id": {"$in": list(author_ids)}})}
    for e in result["items"]:
        e["author"] = to_user_public(authors[e["author_id"]]) if e["author_id"] in authors else None
    return result


@router.put("/{evaluation_id}/respond", response_model=EvaluationResponse)
def respond_to_evaluation(
    evaluation_id: str,
    data: EvaluationResponseUpdate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    evaluation = db.evaluations.find_one({"_id": evaluation_id})
    if not evaluation:
        raise HTTPException(status_code=404, detail="Évaluation introuvable")
    if str(evaluation["target_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Seule la cible peut répondre")

    db.evaluations.update_one({"_id": evaluation_id}, {"$set": {"response": data.response}})
    evaluation = db.evaluations.find_one({"_id": evaluation_id})
    result = serialize_doc(evaluation)
    author = db.users.find_one({"_id": evaluation["author_id"]})
    result["author"] = to_user_public(author) if author else None
    return result


@router.post("/{evaluation_id}/flag")
def flag_evaluation(
    evaluation_id: str,
    data: FlagEvaluation,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    evaluation = db.evaluations.find_one({"_id": evaluation_id})
    if not evaluation:
        raise HTTPException(status_code=404, detail="Évaluation introuvable")
    # Le signalement envoie l'avis en modération ; seul un admin peut le masquer.
    db.evaluations.update_one(
        {"_id": evaluation_id},
        {"$set": {"is_flagged": True, "flag_reason": data.reason, "flagged_by": current_user["id"]}},
    )
    return {"message": "Évaluation signalée à la modération"}
