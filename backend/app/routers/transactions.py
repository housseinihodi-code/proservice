import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from pymongo.database import Database

from app.database import get_db
from app.models.mission import PaymentStatus
from app.models.transaction import TransactionStatus, PaymentMethod
from app.models.wallet import WalletTransactionType
from app.schemas.transaction import PaymentInitiate, TransactionResponse, PaginatedTransactions
from app.utils.security import get_current_user
from app.utils.helpers import paginate, serialize_doc

router = APIRouter()


def _pay_from_wallet(db: Database, user_id: str, mission: dict):
    """Débit atomique du portefeuille : échoue si le solde est insuffisant."""
    from app.services.payment_service import PaymentResult
    from app.routers.wallet import _get_or_create_wallet
    wallet = _get_or_create_wallet(db, user_id)
    res = db.wallets.update_one(
        {"_id": wallet["_id"], "balance": {"$gte": mission["amount"]}},
        {"$inc": {"balance": -mission["amount"]}},
    )
    if res.modified_count != 1:
        return PaymentResult(success=False, message="Solde du portefeuille insuffisant")
    ref = f"WAL-{uuid.uuid4().hex[:10].upper()}"
    db.wallet_transactions.insert_one({
        "_id": str(uuid.uuid4()),
        "wallet_id": wallet["_id"],
        "type": WalletTransactionType.MISSION_PAYMENT,
        "amount": -mission["amount"],
        "reference": ref,
        "note": f"Paiement de la mission « {mission['title']} »",
        "created_at": datetime.utcnow(),
    })
    return PaymentResult(success=True, reference=ref)


@router.post("/initiate", response_model=TransactionResponse, status_code=201)
async def initiate_payment(
    data: PaymentInitiate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    mission = db.missions.find_one({"_id": data.mission_id})
    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    if str(mission["client_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="Seul le client peut payer")
    if mission["payment_status"] != PaymentStatus.PENDING:
        raise HTTPException(status_code=400, detail="Le paiement a déjà été initié")

    from app.services.payment_service import process_payment
    if data.payment_method == PaymentMethod.WALLET:
        result = _pay_from_wallet(db, current_user["id"], mission)
    else:
        result = await process_payment(data.payment_method, data.phone_number or "", mission["amount"])
    if not result.success and data.payment_method == PaymentMethod.WALLET:
        raise HTTPException(status_code=400, detail=result.message)

    now = datetime.utcnow()
    txn = {
        "_id": str(uuid.uuid4()),
        "mission_id": mission["_id"],
        "client_id": current_user["id"],
        "professional_id": mission["professional_id"],
        "amount": mission["amount"],
        "commission": mission["commission_amount"],
        "net_amount": mission["net_amount"],
        "payment_method": data.payment_method,
        "status": TransactionStatus.PROCESSING if result.success else TransactionStatus.FAILED,
        "operator_reference": result.reference,
        "phone_number": data.phone_number,
        "created_at": now,
        "updated_at": now,
    }
    db.transactions.insert_one(txn)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.message or "Échec du paiement, veuillez réessayer")
    db.missions.update_one({"_id": mission["_id"]}, {"$set": {"payment_status": PaymentStatus.IN_ESCROW, "updated_at": now}})

    return serialize_doc(txn)


@router.get("/", response_model=PaginatedTransactions)
def list_transactions(
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
    return paginate(db.transactions, filter, sort=[("created_at", -1)], page=page, size=size)


@router.get("/{txn_id}", response_model=TransactionResponse)
def get_transaction(txn_id: str, db: Database = Depends(get_db), current_user: dict = Depends(get_current_user)):
    txn = db.transactions.find_one({"_id": txn_id})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction introuvable")
    if str(txn["client_id"]) != str(current_user["id"]) and str(txn["professional_id"]) != str(current_user["id"]) and current_user["role"] not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(status_code=403, detail="Non autorisé")
    return serialize_doc(txn)
