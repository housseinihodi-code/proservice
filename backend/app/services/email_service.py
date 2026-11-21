import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

from app.config import settings
from app.utils.helpers import format_money

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, html_content: str) -> bool:
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"Email non envoyé (SMTP non configuré) : {subject} → {to}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.FROM_EMAIL
        msg["To"] = to
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as e:
        logger.error(f"Erreur d'envoi email : {e}")
        return False


def send_welcome_email(to: str, first_name: str) -> bool:
    html = f"""
    <html><body>
    <h2>Bienvenue sur ProServices, {first_name} !</h2>
    <p>Votre compte a été créé avec succès.</p>
    <p>Commencez dès maintenant à explorer nos professionnels qualifiés.</p>
    <br><p>L'équipe ProServices</p>
    </body></html>
    """
    return send_email(to, "Bienvenue sur ProServices", html)


def send_mission_notification(to: str, first_name: str, mission_title: str, action: str) -> bool:
    html = f"""
    <html><body>
    <h2>Bonjour {first_name},</h2>
    <p>Une mise à jour concernant votre mission <strong>"{mission_title}"</strong> :</p>
    <p>{action}</p>
    <br><p>L'équipe ProServices</p>
    </body></html>
    """
    return send_email(to, f"Mise à jour mission : {mission_title}", html)


def send_payment_confirmation(to: str, first_name: str, amount: float, mission_title: str) -> bool:
    html = f"""
    <html><body>
    <h2>Confirmation de paiement</h2>
    <p>Bonjour {first_name},</p>
    <p>Votre paiement de <strong>{format_money(amount)}</strong> pour la mission <strong>"{mission_title}"</strong> a été reçu et placé en séquestre.</p>
    <p>Il sera libéré au prestataire après validation des livrables.</p>
    <br><p>L'équipe ProServices</p>
    </body></html>
    """
    return send_email(to, "Confirmation de paiement", html)


def send_document_validation_email(to: str, first_name: str, doc_name: str, approved: bool, reason: Optional[str] = None) -> bool:
    status_text = "approuvé ✅" if approved else "rejeté ❌"
    html = f"""
    <html><body>
    <h2>Validation de document</h2>
    <p>Bonjour {first_name},</p>
    <p>Votre document <strong>"{doc_name}"</strong> a été <strong>{status_text}</strong>.</p>
    {"<p>Raison : " + reason + "</p>" if reason else ""}
    <br><p>L'équipe ProServices</p>
    </body></html>
    """
    return send_email(to, f"Document {status_text}", html)
