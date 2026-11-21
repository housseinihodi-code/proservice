import enum


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_ESCROW = "IN_ESCROW"
    RELEASED = "RELEASED"
    REFUNDED = "REFUNDED"


class MissionStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    DISPUTED = "DISPUTED"
