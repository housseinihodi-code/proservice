import enum


class UserRole(str, enum.Enum):
    PROFESSIONAL = "PROFESSIONAL"
    CLIENT = "CLIENT"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"
