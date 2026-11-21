"""Mouvements d'argent liés au séquestre d'une mission.

Chaque fonction bascule d'abord le statut de paiement de façon conditionnelle
(IN_ESCROW -> RELEASED/REFUNDED) : si deux requêtes arrivent en même temps,
une seule réussit, donc l'argent n'est jamais versé deux fois.
"""
import uuid
from datetime import datetime

from pymongo.database import Database

from app.models.mission import MissionStatus, PaymentStatus
from app.models.transaction import TransactionStatus
from app.models.wallet import WalletTransactionType


def _credit(db: Database, user_id: str, amount: float, tx_type: WalletTransactionType, note: str, reference: str) -> None:
    from app.routers.wallet import _get_or_create_wallet
    wallet = _get_or_create_wallet(db, user_id)
    db.wallets.update_one({"_id": wallet["_id"]}, {"$inc": {"balance": amount}})
    db.wallet_transactions.insert_one({
        "_id": str(uuid.uuid4()),
        "wallet_id": wallet["_id"],
        "type": tx_type,
        "amount": amount,
        "reference": reference,
        "note": note,
        "created_at": datetime.utcnow(),
    })


def release_to_professional(db: Database, mission: dict, extra: dict = None) -> bool:
    """Libère le paiement au professionnel et termine la mission."""
    now = datetime.utcnow()
    updates = {
        "payment_status": PaymentStatus.RELEASED,
        "mission_status": MissionStatus.COMPLETED,
        "deliverable_validated": True,
        "end_date": now,
        "updated_at": now,
        **(extra or {}),
    }
    res = db.missions.update_one({"_id": mission["_id"], "payment_status": PaymentStatus.IN_ESCROW}, {"$set": updates})
    if res.modified_count != 1:
        return False
    db.transactions.update_one(
        {"mission_id": mission["_id"], "status": TransactionStatus.PROCESSING},
        {"$set": {"status": TransactionStatus.COMPLETED, "updated_at": now}},
    )
    _credit(db, mission["professional_id"], mission["net_amount"], WalletTransactionType.MISSION_PAYOUT,
            f"Paiement de la mission « {mission['title']} »", mission["_id"])
    if mission.get("offer_id"):
        db.offers.update_one({"_id": mission["offer_id"]}, {"$set": {"status": "CLOSED", "updated_at": now}})
    return True


def refund_to_client(db: Database, mission: dict) -> bool:
    """Rembourse le client sur son portefeuille et annule la mission."""
    now = datetime.utcnow()
    res = db.missions.update_one(
        {"_id": mission["_id"], "payment_status": PaymentStatus.IN_ESCROW},
        {"$set": {"payment_status": PaymentStatus.REFUNDED, "mission_status": MissionStatus.CANCELLED, "updated_at": now}},
    )
    if res.modified_count != 1:
        return False
    db.transactions.update_one(
        {"mission_id": mission["_id"], "status": TransactionStatus.PROCESSING},
        {"$set": {"status": TransactionStatus.REFUNDED, "updated_at": now}},
    )
    _credit(db, mission["client_id"], mission["amount"], WalletTransactionType.MISSION_REFUND,
            f"Remboursement de la mission « {mission['title']} »", mission["_id"])
    return True


def close_offer(db: Database, mission: dict) -> None:
    """Une mission issue d'une offre est annulée : l'offre attribuée est clôturée."""
    if mission.get("offer_id"):
        db.offers.update_one(
            {"_id": mission["offer_id"], "status": "IN_PROGRESS"},
            {"$set": {"status": "CLOSED", "updated_at": datetime.utcnow()}},
        )
