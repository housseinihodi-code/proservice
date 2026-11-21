import re
from pydantic import BaseModel, field_validator, model_validator, Field
from typing import Optional, List
from datetime import datetime
from app.models.transaction import PaymentMethod, TransactionStatus


MOBILE_MONEY = (PaymentMethod.MTN_MOMO, PaymentMethod.ORANGE_MONEY)


def _clean_phone(v):
    if v in (None, ""):
        return None
    v = re.sub(r"[\s.\-()]", "", str(v))
    if not re.fullmatch(r"\+?[1-9]\d{6,14}", v):
        raise ValueError("Numéro de téléphone invalide (format international, ex. +33612345678)")
    return v


class PaymentInitiate(BaseModel):
    mission_id: str
    payment_method: PaymentMethod
    phone_number: Optional[str] = None

    @field_validator("phone_number", mode="before")
    @classmethod
    def clean_phone(cls, v):
        return _clean_phone(v)

    @model_validator(mode="after")
    def phone_for_mobile_money(self):
        if self.payment_method in MOBILE_MONEY and not self.phone_number:
            raise ValueError("Un numéro de téléphone est requis pour le paiement Mobile Money")
        return self


class TransactionResponse(BaseModel):
    id: str
    mission_id: str
    client_id: str
    professional_id: str
    amount: float
    commission: float
    net_amount: float
    payment_method: PaymentMethod
    status: TransactionStatus
    operator_reference: Optional[str] = None
    phone_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PaginatedTransactions(BaseModel):
    items: List[TransactionResponse]
    total: int
    page: int
    size: int
    pages: int
