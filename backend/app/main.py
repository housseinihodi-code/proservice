from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os

from app.config import settings
from app.database import db, init_indexes
from app.routers import auth, users, professionals, offers, missions, messages, evaluations, transactions, documents, admin, wallet, trades, contact


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_indexes(db)
    trades.seed_trades(db)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="API — Plateforme de mise en relation professionnels qualifiés & demandeurs de services, partout dans le monde",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/uploads/documents/{path:path}", include_in_schema=False)
def _private_documents(path: str):
    # Les pièces justificatives (identité, diplômes...) ne sont jamais servies publiquement :
    # elles passent par GET /api/documents/{id}/file, réservé au propriétaire et aux admins.
    raise HTTPException(status_code=404, detail="Introuvable")


@app.get("/uploads/{folder}/{filename}", include_in_schema=False)
def _public_upload(folder: str, filename: str):
    # Photos de profil et portfolio : publics, stockés dans MongoDB (GridFS) — voir file_service.
    from app.services.file_service import read_file
    if folder not in ("avatars", "portfolio"):
        raise HTTPException(status_code=404, detail="Introuvable")
    found = read_file(f"{folder}/{filename}")
    if not found:
        raise HTTPException(status_code=404, detail="Introuvable")
    content, mime = found
    return Response(content, media_type=mime, headers={"Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff"})

app.include_router(auth.router, prefix="/api/auth", tags=["Authentification"])
app.include_router(users.router, prefix="/api/users", tags=["Utilisateurs"])
app.include_router(professionals.router, prefix="/api/professionals", tags=["Professionnels"])
app.include_router(offers.router, prefix="/api/offers", tags=["Offres de Mission"])
app.include_router(missions.router, prefix="/api/missions", tags=["Missions"])
app.include_router(messages.router, prefix="/api/messages", tags=["Messagerie"])
app.include_router(evaluations.router, prefix="/api/evaluations", tags=["Évaluations"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(trades.admin_router, prefix="/api/admin/trades", tags=["Administration"])
app.include_router(contact.admin_router, prefix="/api/admin/contact", tags=["Administration"])
app.include_router(admin.router, prefix="/api/admin", tags=["Administration"])
app.include_router(trades.router, prefix="/api/trades", tags=["Métiers"])
app.include_router(contact.router, prefix="/api/contact", tags=["Contact"])
app.include_router(wallet.router, prefix="/api/wallet", tags=["Portefeuille"])


@app.get("/", tags=["Santé"])
def root():
    return {"message": "ProServices API", "version": "1.0.0", "docs": "/api/docs"}


@app.get("/api/health", tags=["Santé"])
def health():
    return {"status": "healthy", "service": settings.APP_NAME}
