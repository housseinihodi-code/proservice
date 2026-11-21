import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from pymongo.database import Database

from app.config import settings
from app.database import get_db
from app.models.wallet import WalletTransactionType
from app.schemas.wallet import WalletResponse, TopUpRequest, TransferRequest, PaginatedWalletTransactions
from app.utils.security import get_current_user
from app.utils.helpers import paginate, serialize_doc

router = APIRouter()


def _get_or_create_wallet(db: Database, user_id: str) -> dict:
    wallet = db.wallets.find_one({"user_id": user_id})
    if wallet:
        return wallet
    wallet = {
        "_id": str(uuid.uuid4()),
        "user_id": user_id,
        "balance": 0.0,
        "currency": settings.CURRENCY,
        "created_at": datetime.utcnow(),
    }
    db.wallets.insert_one(wallet)
    return wallet


@router.get("/me", response_model=WalletResponse)
def get_my_wallet(db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return serialize_doc(_get_or_create_wallet(db, current_user["id"]))


@router.get("/transactions", response_model=PaginatedWalletTransactions)
def list_wallet_transactions(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    wallet = _get_or_create_wallet(db, current_user["id"])
    return paginate(db.wallet_transactions, {"wallet_id": wallet["_id"]}, sort=[("created_at", -1)], page=page, size=size)


@router.post("/topup", response_model=WalletResponse, status_code=201)
async def topup_wallet(
    data: TopUpRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    from app.services.payment_service import process_payment
    result = await process_payment(data.payment_method, data.phone_number or "", data.amount)
    if not result.success:
        raise HTTPException(status_code=400, detail="Échec du paiement, veuillez réessayer")

    wallet = _get_or_create_wallet(db, current_user["id"])
    now = datetime.utcnow()
    db.wallets.update_one({"_id": wallet["_id"]}, {"$inc": {"balance": data.amount}})
    db.wallet_transactions.insert_one({
        "_id": str(uuid.uuid4()),
        "wallet_id": wallet["_id"],
        "type": WalletTransactionType.TOPUP,
        "amount": data.amount,
        "reference": result.reference,
        "note": f"Rechargement via {data.payment_method}",
        "created_at": now,
    })
    wallet = db.wallets.find_one({"_id": wallet["_id"]})
    return serialize_doc(wallet)


@router.post("/transfer", response_model=WalletResponse)
def transfer_funds(
    data: TransferRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    recipient_user = db.users.find_one({"email": data.recipient}) or db.users.find_one({"phone": data.recipient})
    if not recipient_user:
        raise HTTPException(status_code=404, detail="Destinataire introuvable")
    if recipient_user["_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous transférer des fonds à vous-même")

    sender_wallet = _get_or_create_wallet(db, current_user["id"])
    if sender_wallet["balance"] < data.amount:
        raise HTTPException(status_code=400, detail="Solde insuffisant")
    recipient_wallet = _get_or_create_wallet(db, recipient_user["_id"])

    now = datetime.utcnow()
    debit = db.wallets.update_one(
        {"_id": sender_wallet["_id"], "balance": {"$gte": data.amount}},
        {"$inc": {"balance": -data.amount}},
    )
    if debit.modified_count != 1:
        raise HTTPException(status_code=400, detail="Solde insuffisant")
    db.wallets.update_one({"_id": recipient_wallet["_id"]}, {"$inc": {"balance": data.amount}})

    db.wallet_transactions.insert_one({
        "_id": str(uuid.uuid4()),
        "wallet_id": sender_wallet["_id"],
        "type": WalletTransactionType.TRANSFER_OUT,
        "amount": data.amount,
        "reference": recipient_user["_id"],
        "note": data.note or f"Transfert vers {recipient_user['first_name']} {recipient_user['last_name']}",
        "created_at": now,
    })
    db.wallet_transactions.insert_one({
        "_id": str(uuid.uuid4()),
        "wallet_id": recipient_wallet["_id"],
        "type": WalletTransactionType.TRANSFER_IN,
        "amount": data.amount,
        "reference": current_user["id"],
        "note": data.note or f"Transfert de {current_user['first_name']} {current_user['last_name']}",
        "created_at": now,
    })

    sender_wallet = db.wallets.find_one({"_id": sender_wallet["_id"]})
    return serialize_doc(sender_wallet)
