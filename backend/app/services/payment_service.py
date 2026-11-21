import httpx
import uuid
import logging
from typing import Optional

from app.config import settings, payments_simulated
from app.models.transaction import PaymentMethod, TransactionStatus

logger = logging.getLogger(__name__)


class PaymentResult:
    def __init__(self, success: bool, reference: Optional[str] = None, message: str = ""):
        self.success = success
        self.reference = reference
        self.message = message


async def initiate_mtn_momo_payment(phone: str, amount: float, reference: str) -> PaymentResult:
    """Lance un paiement MTN Mobile Money."""
    if not settings.MTN_MOMO_SUBSCRIPTION_KEY:
        # Sans clé, on ne simule qu'en développement : en production, aucun argent ne serait réellement encaissé.
        if not payments_simulated():
            return PaymentResult(success=False, message="MTN Mobile Money non disponible")
        logger.warning("MTN MoMo non configuré — simulation de paiement (mode simulation)")
        return PaymentResult(success=True, reference=f"MTN-SIM-{uuid.uuid4().hex[:8].upper()}", message="Simulation MTN MoMo")

    try:
        headers = {
            "Ocp-Apim-Subscription-Key": settings.MTN_MOMO_SUBSCRIPTION_KEY,
            "Authorization": f"Bearer {settings.MTN_MOMO_API_KEY}",
            "X-Reference-Id": reference,
            "X-Target-Environment": settings.MTN_MOMO_ENVIRONMENT,
            "Content-Type": "application/json",
        }
        payload = {
            "amount": str(int(amount)),
            "currency": settings.CURRENCY,
            "externalId": reference,
            "payer": {"partyIdType": "MSISDN", "partyId": phone.replace("+", "")},
            "payerMessage": "Paiement ProServices",
            "payeeNote": "Mission ProServices",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            url = f"https://sandbox.momodeveloper.mtn.com/collection/v1_0/requesttopay"
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 202:
                return PaymentResult(success=True, reference=reference, message="Paiement initié")
            return PaymentResult(success=False, message=f"Erreur MTN: {resp.status_code}")
    except Exception as e:
        logger.error(f"Erreur MTN MoMo: {e}")
        return PaymentResult(success=False, message=str(e))


async def initiate_orange_money_payment(phone: str, amount: float, reference: str) -> PaymentResult:
    """Lance un paiement Orange Money."""
    if not settings.ORANGE_MONEY_CLIENT_ID:
        if not payments_simulated():
            return PaymentResult(success=False, message="Orange Money non disponible")
        logger.warning("Orange Money non configuré — simulation de paiement (mode simulation)")
        return PaymentResult(success=True, reference=f"OM-SIM-{uuid.uuid4().hex[:8].upper()}", message="Simulation Orange Money")

    try:
        token_resp = httpx.post(
            "https://api.orange.com/oauth/v3/token",
            data={"grant_type": "client_credentials"},
            auth=(settings.ORANGE_MONEY_CLIENT_ID, settings.ORANGE_MONEY_CLIENT_SECRET),
            timeout=15,
        )
        if token_resp.status_code != 200:
            return PaymentResult(success=False, message="Impossible d'obtenir le token Orange Money")

        token = token_resp.json().get("access_token")
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.orange.com/orange-money-webpay/cm/v1/webpayment",
                json={
                    "merchant_key": settings.ORANGE_MONEY_CLIENT_ID,
                    "currency": settings.CURRENCY,
                    "order_id": reference,
                    "amount": int(amount),
                    "return_url": f"{settings.FRONTEND_URL}/transactions",
                    "cancel_url": f"{settings.FRONTEND_URL}/transactions",
                    "notif_url": f"{settings.PUBLIC_API_URL}/api/webhooks/orange",
                    "lang": "fr",
                    "reference": reference,
                },
                headers={"Authorization": f"Bearer {token}"},
            )
            if resp.status_code in (200, 201):
                return PaymentResult(success=True, reference=reference, message="Paiement Orange Money initié")
            return PaymentResult(success=False, message=f"Erreur Orange: {resp.status_code}")
    except Exception as e:
        logger.error(f"Erreur Orange Money: {e}")
        return PaymentResult(success=False, message=str(e))


async def process_payment(method: PaymentMethod, phone: str, amount: float) -> PaymentResult:
    ref = f"TXN-{uuid.uuid4().hex[:12].upper()}"
    if method == PaymentMethod.MTN_MOMO:
        return await initiate_mtn_momo_payment(phone, amount, ref)
    elif method == PaymentMethod.ORANGE_MONEY:
        return await initiate_orange_money_payment(phone, amount, ref)
    # Carte / virement : pas encore de passerelle réelle (Stripe, etc.).
    # Simulation uniquement en développement (DEBUG=true), refus en production.
    if payments_simulated():
        logger.warning("Passerelle carte/virement non configurée — simulation (mode simulation)")
        return PaymentResult(success=True, reference=f"CARD-SIM-{uuid.uuid4().hex[:8].upper()}", message="Simulation carte")
    return PaymentResult(success=False, message="Moyen de paiement non disponible")
