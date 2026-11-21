"""Crée (ou promeut) un compte Super Admin.

Usage, depuis le dossier backend :
    python create_admin.py admin@exemple.fr "MotDePasse1" Prénom Nom

Les administrateurs suivants s'ajoutent ensuite depuis l'interface
(Administration > Équipe), réservée aux Super Admins.
"""
import sys
import uuid
from datetime import datetime

from app.database import db, init_indexes
from app.utils.security import hash_password


def main() -> None:
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(1)
    email, password, first_name, last_name = sys.argv[1:]
    email = email.strip().lower()
    if len(password) < 8 or not any(c.isupper() for c in password) or not any(c.isdigit() for c in password):
        sys.exit("Mot de passe trop faible : 8 caractères minimum, avec une majuscule et un chiffre.")

    init_indexes(db)
    now = datetime.utcnow()
    existing = db.users.find_one({"email": email})
    if existing:
        db.users.update_one({"_id": existing["_id"]}, {"$set": {
            "role": "SUPER_ADMIN", "is_active": True, "is_verified": True,
            "password_hash": hash_password(password), "updated_at": now,
        }})
        print(f"Compte existant promu Super Admin : {email}")
        return

    db.users.insert_one({
        "_id": str(uuid.uuid4()),
        "email": email,
        "phone": None,
        "password_hash": hash_password(password),
        "first_name": first_name,
        "last_name": last_name,
        "role": "SUPER_ADMIN",
        "is_active": True,
        "is_verified": True,
        "profile_picture_url": None,
        "country": "FR",
        "region": None,
        "city": None,
        "created_at": now,
        "updated_at": now,
    })
    print(f"Super Admin créé : {email}")


if __name__ == "__main__":
    main()
