import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.data.trades import DEFAULT_TRADES
from app.database import get_db
from app.utils.helpers import serialize_doc
from app.utils.security import require_admin

router = APIRouter()
admin_router = APIRouter()


class TradeCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    domain: str = Field(..., min_length=2, max_length=80)


class TradeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=80)
    domain: Optional[str] = Field(None, min_length=2, max_length=80)
    is_active: Optional[bool] = None


class TradeResponse(BaseModel):
    id: str
    name: str
    domain: str
    is_active: bool = True
    professionals_count: int = 0
    open_offers_count: int = 0


def seed_trades(db: Database) -> None:
    """Insère le catalogue par défaut si la collection est vide."""
    if db.trades.count_documents({}) > 0:
        return
    now = datetime.utcnow()
    db.trades.insert_many([
        {"_id": str(uuid.uuid4()), "name": name, "domain": domain, "is_active": True, "created_at": now}
        for domain, names in DEFAULT_TRADES.items()
        for name in names
    ])


def active_trade_names(db: Database) -> set:
    return {t["name"] for t in db.trades.find({"is_active": True}, {"name": 1})}


def _counts(db: Database) -> tuple:
    pros = {
        r["_id"]: r["n"]
        for r in db.professional_profiles.aggregate([
            {"$unwind": "$trades"}, {"$group": {"_id": "$trades", "n": {"$sum": 1}}},
        ])
    }
    offers = {
        r["_id"]: r["n"]
        for r in db.offers.aggregate([
            {"$match": {"status": "OPEN", "trade": {"$type": "string"}}},
            {"$group": {"_id": "$trade", "n": {"$sum": 1}}},
        ])
    }
    return pros, offers


def _list(db: Database, filter: dict) -> List[dict]:
    pros, offers = _counts(db)
    items = []
    for t in db.trades.find(filter).sort([("domain", 1), ("name", 1)]):
        d = serialize_doc(t)
        d["professionals_count"] = pros.get(t["name"], 0)
        d["open_offers_count"] = offers.get(t["name"], 0)
        items.append(d)
    return items


@router.get("/", response_model=List[TradeResponse])
def list_trades(domain: Optional[str] = Query(None), db: Database = Depends(get_db)):
    filter = {"is_active": True}
    if domain:
        filter["domain"] = domain
    return _list(db, filter)


# ---------- Administration ----------

@admin_router.get("/", response_model=List[TradeResponse])
def admin_list_trades(db: Database = Depends(get_db), _=Depends(require_admin)):
    return _list(db, {})


@admin_router.post("/", response_model=TradeResponse, status_code=201)
def create_trade(data: TradeCreate, db: Database = Depends(get_db), _=Depends(require_admin)):
    trade = {
        "_id": str(uuid.uuid4()),
        "name": data.name.strip(),
        "domain": data.domain.strip(),
        "is_active": True,
        "created_at": datetime.utcnow(),
    }
    try:
        db.trades.insert_one(trade)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Ce métier existe déjà")
    return serialize_doc(trade)


@admin_router.put("/{trade_id}", response_model=TradeResponse)
def update_trade(trade_id: str, data: TradeUpdate, db: Database = Depends(get_db), _=Depends(require_admin)):
    trade = db.trades.find_one({"_id": trade_id})
    if not trade:
        raise HTTPException(status_code=404, detail="Métier introuvable")
    updates = data.model_dump(exclude_none=True)
    if "name" in updates:
        updates["name"] = updates["name"].strip()
    if not updates:
        return serialize_doc(trade)
    try:
        db.trades.update_one({"_id": trade_id}, {"$set": updates})
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Ce métier existe déjà")

    # Un renommage est répercuté sur les profils et les offres qui l'utilisent.
    if "name" in updates and updates["name"] != trade["name"]:
        old, new = trade["name"], updates["name"]
        db.professional_profiles.update_many(
            {"trades": old}, {"$set": {"trades.$[t]": new}}, array_filters=[{"t": old}]
        )
        db.offers.update_many({"trade": old}, {"$set": {"trade": new}})
    return serialize_doc(db.trades.find_one({"_id": trade_id}))


@admin_router.delete("/{trade_id}", status_code=204)
def delete_trade(trade_id: str, db: Database = Depends(get_db), _=Depends(require_admin)):
    trade = db.trades.find_one({"_id": trade_id})
    if not trade:
        raise HTTPException(status_code=404, detail="Métier introuvable")
    db.professional_profiles.update_many({"trades": trade["name"]}, {"$pull": {"trades": trade["name"]}})
    db.offers.update_many({"trade": trade["name"]}, {"$set": {"trade": None}})
    db.trades.delete_one({"_id": trade_id})
