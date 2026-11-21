import enum


class DocumentType(str, enum.Enum):
    DIPLOMA = "DIPLOMA"
    CERTIFICATE = "CERTIFICATE"
    ID_CARD = "ID_CARD"
    OTHER = "OTHER"


class DocumentStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
