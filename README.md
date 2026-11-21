# ProServices Cameroun — Plateforme de mise en relation

> Plateforme numérique de mise en relation entre professionnels qualifiés et demandeurs de services au Cameroun.

## Stack technologique

| Couche | Technologie |
|--------|------------|
| Frontend | React.js 18 + Vite + Tailwind CSS |
| Backend | Python 3.9+ + FastAPI |
| Base de données | MongoDB 7 (PyMongo) |
| Cache | Redis 7 |
| Auth | JWT (access + refresh token) |
| Paiement | MTN MoMo + Orange Money |
| Containerisation | Docker + Docker Compose |

---

## Démarrage rapide (Docker)

### 1. Cloner et configurer

```bash
cd fonkou
cp .env.example .env
```

### 2. Lancer avec Docker Compose

```bash
docker-compose up --build
```

### 3. Accéder à l'application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API (docs Swagger) | http://localhost:8000/api/docs |
| API (ReDoc) | http://localhost:8000/api/redoc |
| API Health | http://localhost:8000/api/health |

---

## Démarrage manuel (développement)

### Backend

```bash
cd backend

# Créer et activer un environnement virtuel
python3 -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac

# Installer les dépendances
pip install -r requirements.txt

# Configurer l'environnement
cp .env.example .env
# .env pointe par défaut sur mongodb://localhost:27017 — inutile d'éditer en local

# Lancer MongoDB (avec Docker, si pas déjà installé en local)
docker run -d --name mongo -p 27017:27017 mongo:7

# Lancer le serveur
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Configurer
cp .env.example .env

# Lancer le serveur de dev
npm run dev
```

---

## Structure du projet

```
fonkou/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── app/
│   │   ├── main.py              # Point d'entrée FastAPI
│   │   ├── config.py            # Configuration
│   │   ├── database.py          # Connexion MongoDB (PyMongo)
│   │   ├── models/              # Enums métier (Mongo = documents, pas d'ORM)
│   │   │   ├── user.py
│   │   │   ├── professional.py
│   │   │   ├── document.py
│   │   │   ├── offer.py
│   │   │   ├── mission.py
│   │   │   ├── message.py
│   │   │   ├── evaluation.py
│   │   │   └── transaction.py
│   │   ├── schemas/             # Schémas Pydantic
│   │   ├── routers/             # Endpoints API
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── professionals.py
│   │   │   ├── offers.py
│   │   │   ├── missions.py
│   │   │   ├── messages.py
│   │   │   ├── evaluations.py
│   │   │   ├── transactions.py
│   │   │   ├── documents.py
│   │   │   └── admin.py
│   │   ├── services/            # Logique métier
│   │   └── utils/               # Utilitaires (sécurité, helpers)
│   └── requirements.txt
└── frontend/
    └── src/
        ├── pages/               # Pages React
        ├── components/          # Composants réutilisables
        ├── services/api.js      # Appels API Axios
        ├── store/authStore.js   # État global (Zustand)
        └── hooks/               # Hooks personnalisés
```

---

## Endpoints API principaux

### Authentification
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | /api/auth/register | Inscription |
| POST | /api/auth/login | Connexion |
| POST | /api/auth/refresh | Rafraîchir le token |

### Professionnels
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/professionals | Liste avec filtres |
| GET | /api/professionals/{id} | Détail profil |
| PUT | /api/professionals/me | Modifier mon profil |

### Missions
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | /api/missions | Mes missions |
| POST | /api/missions | Créer une mission |
| POST | /api/missions/{id}/accept | Accepter |
| POST | /api/missions/{id}/validate-deliverable | Valider livrable |

### Paiements
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | /api/transactions/initiate | Initier paiement |
| GET | /api/transactions | Historique |

---

## Comptes de test

Après démarrage, créer des comptes via `/api/docs` ou l'interface :

- **Admin** : S'inscrire avec rôle CLIENT, puis changer le rôle en ADMIN via la base de données
- **Professionnel** : S'inscrire avec rôle PROFESSIONAL
- **Client** : S'inscrire avec rôle CLIENT

---

## Variables d'environnement importantes

```env
# Base de données
MONGO_URI=mongodb://localhost:27017
MONGO_DB_NAME=proservices

# Sécurité (CHANGER EN PRODUCTION)
SECRET_KEY=votre-cle-secrete-tres-longue-et-complexe

# Mobile Money (optionnel en développement — mode simulation)
MTN_MOMO_API_KEY=
MTN_MOMO_SUBSCRIPTION_KEY=
ORANGE_MONEY_CLIENT_ID=
ORANGE_MONEY_CLIENT_SECRET=

# Email (optionnel en développement)
SMTP_USER=
SMTP_PASSWORD=
```

---

## Conformité réglementaire Cameroun

- Loi N°2010/012 — Cybersécurité et cybercriminalité
- Loi N°2010/021 — Commerce électronique
- Données hébergées en Afrique (AWS Cape Town recommandé)
- Déclaration ANTIC requise avant mise en production

---

## Développé pour

**ProServices Cameroun**
Chef de projet : FONKOU KANKEU ERIC PERRIEN
