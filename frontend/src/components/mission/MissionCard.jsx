import { Link } from "react-router-dom";
import { mediaUrl } from "../../services/api";
import { Clock, CheckCircle, XCircle, AlertTriangle, CreditCard } from "lucide-react";

const STATUS_CONFIG = {
  PENDING: { label: "En attente", icon: Clock, style: "badge-yellow" },
  IN_PROGRESS: { label: "En cours", icon: Clock, style: "badge-blue" },
  COMPLETED: { label: "Terminée", icon: CheckCircle, style: "badge-green" },
  CANCELLED: { label: "Annulée", icon: XCircle, style: "badge-gray" },
  DISPUTED: { label: "Litige", icon: AlertTriangle, style: "badge-red" },
};

const PAYMENT_CONFIG = {
  PENDING: { label: "Non payé", style: "badge-yellow" },
  IN_ESCROW: { label: "En séquestre", style: "badge-blue" },
  RELEASED: { label: "Libéré", style: "badge-green" },
  REFUNDED: { label: "Remboursé", style: "badge-gray" },
};

export default function MissionCard({ mission, currentUserId }) {
  const statusConf = STATUS_CONFIG[mission.mission_status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConf.icon;
  const paymentConf = PAYMENT_CONFIG[mission.payment_status] || PAYMENT_CONFIG.PENDING;
  const isClient = String(mission.client_id) === String(currentUserId);
  const other = isClient ? mission.professional : mission.client;

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-gray-900">{mission.title}</h3>
        <span className={`badge ${statusConf.style} flex items-center gap-1 flex-shrink-0`}>
          <StatusIcon className="w-3 h-3" /> {statusConf.label}
        </span>
      </div>

      <p className="text-gray-600 text-sm line-clamp-2 mb-4">{mission.description}</p>

      {other && (
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
          <img
            src={mediaUrl(other.profile_picture_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent((other.first_name || "") + " " + (other.last_name || ""))}&background=e5e7eb&color=374151&size=24`}
            alt=""
            className="w-6 h-6 rounded-full"
          />
          {isClient ? "Prestataire" : "Client"} : <strong className="text-gray-900">{other.first_name} {other.last_name}</strong>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-lg font-bold text-gray-900">{mission.amount?.toLocaleString("fr-FR")} <span className="text-xs font-normal text-gray-500">€</span></div>
          <div className="flex items-center gap-1">
            <CreditCard className="w-3 h-3 text-gray-400" />
            <span className={`badge text-xs ${paymentConf.style}`}>{paymentConf.label}</span>
          </div>
        </div>
        <Link to={`/missions`} className="btn-accent text-sm py-1.5 px-4">Détails</Link>
      </div>

      {mission.deadline && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          Deadline : {new Date(mission.deadline).toLocaleDateString("fr-FR")}
        </div>
      )}
    </div>
  );
}
