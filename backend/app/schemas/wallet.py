from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional
from datetime import datetime

from app.models.transaction import PaymentMethod
from app.schemas.transaction import _clean_phone, MOBILE_MONEY


class WalletResponse(BaseModel):
    id: str
    user_id: str
    balance: float
    currency: str
    created_at: datetime

    model_config = {"from_attributes": True}


class WalletTransactionResponse(BaseModel):
    id: str
    wallet_id: str
    type: str
    amount: float
    reference: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TopUpRequest(BaseModel):
    amount: float = Field(..., gt=0)
    payment_method: PaymentMethod
    phone_number: Optional[str] = None

    @field_validator("phone_number", mode="before")
    @classmethod
    def clean_phone(cls, v):
        return _clean_phone(v)

    @model_validator(mode="after")
    def check_method(self):
        if self.payment_method == PaymentMethod.WALLET:
            raise ValueError("Impossible de recharger le portefeuille avec lui-même")
        if self.payment_method in MOBILE_MONEY and not self.phone_number:
            raise ValueError("Un numéro de téléphone est requis pour le paiement Mobile Money")
        return self


class TransferRequest(BaseModel):
    recipient: str = Field(..., min_length=3, description="Email ou téléphone du destinataire")
    amount: float = Field(..., gt=0)
    note: Optional[str] = Field(None, max_length=200)


class PaginatedWalletTransactions(BaseModel):
    items: List[WalletTransactionResponse]
    total: int
    page: int
    size: int
    pages: int
