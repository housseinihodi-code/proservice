import enum


class PaymentMethod(str, enum.Enum):
    MTN_MOMO = "MTN_MOMO"
    ORANGE_MONEY = "ORANGE_MONEY"
    CARD = "CARD"
    BANK_TRANSFER = "BANK_TRANSFER"
    WALLET = "WALLET"


class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"
