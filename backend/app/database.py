from pymongo import MongoClient
from pymongo.database import Database

from app.config import settings

client = MongoClient(settings.MONGO_URI)
db: Database = client[settings.MONGO_DB_NAME]


def get_db() -> Database:
    return db


def init_indexes(db: Database) -> None:
    db.users.create_index("email", unique=True)
    # partial (not sparse): a sparse index only skips documents where the
    # field is entirely absent, but we always store a "phone" key (possibly
    # None) — so a plain sparse unique index would still collide across
    # every user who registers without a phone number.
    db.users.create_index(
        "phone", unique=True, partialFilterExpression={"phone": {"$type": "string"}}
    )

    db.contact_messages.create_index([("status", 1), ("created_at", -1)])

    db.missions.create_index("client_id")
    db.missions.create_index("professional_id")
    db.messages.create_index("sender_id")
    db.messages.create_index("receiver_id")
    db.documents.create_index("professional_id")
    db.evaluations.create_index("target_id")
    db.offers.create_index("client_id")
    db.applications.create_index("offer_id")
    db.transactions.create_index("client_id")
    db.transactions.create_index("professional_id")
    db.professional_profiles.create_index("user_id", unique=True)

    db.wallets.create_index("user_id", unique=True)
    db.wallet_transactions.create_index("wallet_id")

    db.trades.create_index("name", unique=True)
    db.trades.create_index("domain")
    db.professional_profiles.create_index("trades")
    db.offers.create_index("trade")

    db.products.create_index("seller_id")
    db.products.create_index("category")
