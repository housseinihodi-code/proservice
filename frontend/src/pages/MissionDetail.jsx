import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Plus, CheckCircle, XCircle, Clock, AlertTriangle, Smartphone, CreditCard, Wallet,
  MessageSquare, Send, ExternalLink, Info, Star,
} from "lucide-react";
import { missionsAPI, transactionsAPI, evaluationsAPI, walletAPI, mediaUrl } from "../services/api";
import { useAuthStore } from "../store/authStore";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import StarRating from "../components/common/StarRating";
import { apiError, formatMoney, PHONE_PLACEHOLDER } from "../constants/locale";

const STATUS_MAP = {
  PENDING: { label: "En attente", badge: "badge-yellow", icon: Clock },
  IN_PROGRESS: { label: "En cours", badge: "badge-blue", icon: Clock },
  COMPLETED: { label: "Terminée", badge: "badge-green", icon: CheckCircle },
  CANCELLED: { label: "Annulée", badge: "badge-gray", icon: XCircle },
  DISPUTED: { label: "Litige", badge: "badge-red", icon: AlertTriangle },
};

const PAYMENT_MAP = {
  PENDING: { label: "Non payée", badge: "badge-gray" },
  IN_ESCROW: { label: "Payée · fonds bloqués", badge: "badge-blue" },
  RELEASED: { label: "Paiement versé", badge: "badge-green" },
  REFUNDED: { label: "Remboursée", badge: "badge-yellow" },
};

const TABS = [
  ["", "Toutes"], ["PENDING", "En attente"], ["IN_PROGRESS", "En cours"],
  ["DISPUTED", "Litiges"], ["COMPLETED", "Terminées"], ["CANCELLED", "Annulées"],
];

const METHODS = [
  ["CARD", "Carte bancaire", CreditCard, "text-primary-600"],
  ["WALLET", "Portefeuille", Wallet, "text-accent-500"],
  ["MTN_MOMO", "MTN MoMo", Smartphone, "text-yellow-500"],
  ["ORANGE_MONEY", "Orange Money", Smartphone, "text-orange-500"],
];

function avatar(u, bg = "2563eb") {
  return mediaUrl(u?.profile_picture_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${u?.first_name || ""} ${u?.last_name || ""}`)}&background=${bg}&color=fff&size=40`;
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : null;
}

export default function MissionDetail() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("");
  const [modal, setModal] = useState(null); // { type, mission }
  const [paymentMethod, setPaymentMethod] = useState("CARD");
  const [phone, setPhone] = useState(user?.phone || "");
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [rating, setRating] = useState(5);

  const open = (type, mission) => {
    setModal({ type, mission });
    setText(type === "deliver" ? mission.delivery_note || "" : "");
    setLink(type === "deliver" ? mission.deliverable_url || "" : "");
    setRating(5);
  };
  const close = () => setModal(null);
  const m = modal?.mission;

  const { data: missions, isLoading } = useQuery({
    queryKey: ["missions", tab],
    queryFn: () => missionsAPI.list({ status: tab || undefined, size: 50 }).then((r) => r.data),
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => walletAPI.getMine().then((r) => r.data),
    enabled: modal?.type === "pay",
  });

  const action = (fn, success, after) => ({
    mutationFn: fn,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      toast.success(res?.data?.message || success);
      after?.();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const acceptM = useMutation(action((id) => missionsAPI.accept(id), "Mission acceptée"));
  const declineM = useMutation(action((id) => missionsAPI.decline(id), "Mission refusée"));
  const cancelM = useMutation(action((id) => missionsAPI.cancel(id), "Mission annulée"));
  const payM = useMutation(action((d) => transactionsAPI.initiate(d), "Paiement effectué : les fonds sont bloqués jusqu'à validation", close));
  const validateM = useMutation(action(({ id, data }) => missionsAPI.validateDeliverable(id, data), "Mission validée", close));
  const deliverM = useMutation(action(({ id, data }) => missionsAPI.deliver(id, data), "Livraison envoyée au client", close));
  const disputeM = useMutation(action(({ id, data }) => missionsAPI.dispute(id, data), "Litige ouvert", close));
  const reviewM = useMutation(action((d) => evaluationsAPI.create(d), "Merci pour votre avis !", close));

  const confirmThen = (msg, fn) => { if (window.confirm(msg)) fn(); };
  const isMobileMoney = ["MTN_MOMO", "ORANGE_MONEY"].includes(paymentMethod);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes missions</h1>
          <p className="text-gray-500 text-sm mt-1">
            {user?.role === "PROFESSIONAL" ? "Les missions que des clients vous ont confiées." : "Les missions que vous avez confiées à des professionnels."}
          </p>
        </div>
        {user?.role === "CLIENT" && (
          <Link to="/recherche" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouvelle mission
          </Link>
        )}
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${tab === val ? "bg-primary-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {label}
          </button>
        ))}
      </div>

      {isLoading ? <Loader /> : missions?.items?.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune mission</h3>
          <p className="text-gray-500 mb-4">{tab ? "Aucune mission dans cette catégorie." : "Vous n'avez pas encore de mission."}</p>
          {user?.role === "CLIENT" && <Link to="/recherche" className="btn-primary">Trouver un professionnel</Link>}
          {user?.role === "PROFESSIONAL" && <Link to="/offres" className="btn-primary">Voir les offres disponibles</Link>}
        </div>
      ) : (
        <div className="space-y-4">
          {missions?.items?.map((mission) => {
            const status = STATUS_MAP[mission.mission_status] || STATUS_MAP.PENDING;
            const payment = PAYMENT_MAP[mission.payment_status] || PAYMENT_MAP.PENDING;
            const StatusIcon = status.icon;
            const isClient = String(mission.client_id) === String(user?.id);
            const isPro = String(mission.professional_id) === String(user?.id);
            const other = isClient ? mission.professional : mission.client;
            const otherId = isClient ? mission.professional_id : mission.client_id;
            const st = mission.mission_status;
            const unpaid = mission.payment_status === "PENDING";

            return (
              <div key={mission.id} className="card p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-lg">{mission.title}</h3>
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">{mission.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`badge ${status.badge} flex items-center gap-1`}><StatusIcon className="w-3 h-3" /> {status.label}</span>
                    <span className={`badge ${payment.badge}`}>{payment.label}</span>
                  </div>
                </div>

                {other && (
                  <div className="flex items-center gap-2 mb-4 text-sm">
                    <img src={avatar(other)} alt="" className="w-7 h-7 rounded-full object-cover" />
                    <span className="text-gray-500">{isClient ? "Professionnel :" : "Client :"}</span>
                    <span className="font-medium text-gray-900">{other.first_name} {other.last_name}</span>
                    {mission.deadline && <span className="text-gray-400 ml-auto">Échéance : {fmtDate(mission.deadline)}</span>}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-xl text-sm">
                  <div><span className="text-gray-500">Montant</span><p className="font-semibold text-gray-900">{formatMoney(mission.amount)}</p></div>
                  <div><span className="text-gray-500">Commission</span><p className="font-semibold text-gray-900">{formatMoney(mission.commission_amount)}</p></div>
                  <div><span className="text-gray-500">{isClient ? "Le pro reçoit" : "Vous recevrez"}</span><p className="font-semibold text-green-700">{formatMoney(mission.net_amount)}</p></div>
                </div>

                {isPro && st === "IN_PROGRESS" && unpaid && (
                  <div className="flex gap-2 items-start mb-4 p-3 rounded-xl bg-yellow-50 text-yellow-800 text-sm">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    Le client n'a pas encore payé. Attendez que les fonds soient bloqués avant de commencer.
                  </div>
                )}

                {mission.delivered_at && (
                  <div className="mb-4 p-4 rounded-xl border border-green-200 bg-green-50 text-sm">
                    <p className="font-semibold text-green-800 mb-1">Travail livré le {fmtDate(mission.delivered_at)}</p>
                    <p className="text-green-900 whitespace-pre-line">{mission.delivery_note}</p>
                    {mission.deliverable_url && (
                      <a href={mission.deliverable_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-green-800 font-medium underline">
                        Voir le livrable <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {isClient && st === "IN_PROGRESS" && <p className="mt-2 text-green-800">Vérifiez le travail puis validez pour libérer le paiement.</p>}
                  </div>
                )}

                {st === "DISPUTED" && (
                  <div className="mb-4 p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">
                    <p className="font-semibold mb-1">Litige en cours d'examen par l'équipe ProServices</p>
                    {mission.dispute_reason && <p>Motif : {mission.dispute_reason}</p>}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {/* Client */}
                  {isClient && ["PENDING", "IN_PROGRESS"].includes(st) && unpaid && (
                    <button onClick={() => open("pay", mission)} className="btn-primary text-sm py-2 px-4">Payer maintenant</button>
                  )}
                  {isClient && st === "IN_PROGRESS" && !unpaid && (
                    <button onClick={() => open("validate", mission)} className={`text-sm py-2 px-4 ${mission.delivered_at ? "btn-accent" : "btn-secondary"}`}>Valider le travail</button>
                  )}
                  {isClient && st === "PENDING" && (
                    <button onClick={() => confirmThen("Annuler cette mission ? Si vous avez payé, vous serez remboursé sur votre portefeuille.", () => cancelM.mutate(mission.id))} className="btn-danger text-sm py-2 px-4">Annuler</button>
                  )}

                  {/* Professionnel */}
                  {isPro && st === "PENDING" && (
                    <>
                      <button onClick={() => acceptM.mutate(mission.id)} disabled={acceptM.isPending} className="btn-primary text-sm py-2 px-4">Accepter la mission</button>
                      <button onClick={() => confirmThen("Refuser cette mission ?", () => declineM.mutate(mission.id))} disabled={declineM.isPending} className="btn-secondary text-sm py-2 px-4">Refuser</button>
                    </>
                  )}
                  {isPro && st === "IN_PROGRESS" && (
                    <button onClick={() => open("deliver", mission)} className="btn-accent text-sm py-2 px-4 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" /> {mission.delivered_at ? "Modifier la livraison" : "Marquer comme livré"}
                    </button>
                  )}

                  {/* Les deux */}
                  {st === "IN_PROGRESS" && (
                    <button onClick={() => open("dispute", mission)} className="text-sm py-2 px-4 rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors">Signaler un problème</button>
                  )}
                  {st === "COMPLETED" && !mission.has_my_evaluation && (
                    <button onClick={() => open("review", mission)} className="btn-accent text-sm py-2 px-4 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5" /> {isClient ? "Noter le professionnel" : "Noter le client"}
                    </button>
                  )}
                  {st === "COMPLETED" && mission.has_my_evaluation && <span className="badge badge-green self-center">Avis envoyé</span>}
                  {st !== "CANCELLED" && (
                    <Link to={`/messages/${otherId}`} className="btn-secondary text-sm py-2 px-4 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Messagerie
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paiement */}
      <Modal isOpen={modal?.type === "pay"} onClose={close} title="Payer la mission">
        <div className="space-y-4">
          <p className="text-gray-600">Montant : <strong>{formatMoney(m?.amount)}</strong>. L'argent reste bloqué par ProServices jusqu'à ce que vous validiez le travail.</p>
          <div className="grid grid-cols-2 gap-3">
            {METHODS.map(([val, label, Icon, color]) => (
              <label key={val} className={`cursor-pointer rounded-xl border-2 p-3 text-center transition-all ${paymentMethod === val ? "border-primary-500 bg-primary-50" : "border-gray-200"}`}>
                <input type="radio" value={val} checked={paymentMethod === val} onChange={() => setPaymentMethod(val)} className="sr-only" />
                <Icon className={`w-6 h-6 mx-auto mb-1 ${color}`} />
                <div className="text-sm font-medium">{label}</div>
                {val === "WALLET" && wallet && <div className="text-xs text-gray-500">Solde : {formatMoney(wallet.balance)}</div>}
              </label>
            ))}
          </div>
          {paymentMethod === "WALLET" && wallet && m && wallet.balance < m.amount && (
            <p className="text-sm text-red-600">Solde insuffisant. <Link to="/portefeuille" className="underline">Recharger le portefeuille</Link></p>
          )}
          {isMobileMoney && (
            <div>
              <label className="form-label">Numéro Mobile Money</label>
              <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={PHONE_PLACEHOLDER} />
            </div>
          )}
          <button
            onClick={() => payM.mutate({ mission_id: m.id, payment_method: paymentMethod, phone_number: isMobileMoney ? phone : undefined })}
            disabled={payM.isPending || (isMobileMoney && !phone)}
            className="btn-primary w-full"
          >
            {payM.isPending ? "Traitement..." : `Payer ${formatMoney(m?.amount)}`}
          </button>
        </div>
      </Modal>

      {/* Validation */}
      <Modal isOpen={modal?.type === "validate"} onClose={close} title="Valider le travail">
        <div className="space-y-4">
          <p className="text-gray-600">Le travail est conforme ? La validation verse <strong>{formatMoney(m?.net_amount)}</strong> au professionnel. Cette action est définitive.</p>
          <button onClick={() => validateM.mutate({ id: m.id, data: { approved: true } })} disabled={validateM.isPending} className="btn-primary w-full flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" /> Valider et libérer le paiement
          </button>
          <div className="border-t border-gray-100 pt-4">
            <label className="form-label">Le travail ne convient pas ? Expliquez pourquoi :</label>
            <textarea rows={3} className="input-field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex : il manque la page contact, la fuite persiste..." />
            <button onClick={() => validateM.mutate({ id: m.id, data: { approved: false, notes: text } })} disabled={text.trim().length < 10 || validateM.isPending} className="btn-danger w-full mt-3 flex items-center justify-center gap-2">
              <XCircle className="w-4 h-4" /> Refuser et ouvrir un litige
            </button>
          </div>
        </div>
      </Modal>

      {/* Livraison */}
      <Modal isOpen={modal?.type === "deliver"} onClose={close} title="Livrer le travail">
        <div className="space-y-4">
          <div>
            <label className="form-label">Ce qui a été réalisé</label>
            <textarea rows={4} className="input-field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Décrivez le travail effectué, les points à vérifier..." />
          </div>
          <div>
            <label className="form-label">Lien vers le livrable (facultatif)</label>
            <input className="input-field" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
          </div>
          <button onClick={() => deliverM.mutate({ id: m.id, data: { delivery_note: text, deliverable_url: link || undefined } })} disabled={text.trim().length < 5 || deliverM.isPending} className="btn-primary w-full">
            {deliverM.isPending ? "Envoi..." : "Envoyer au client"}
          </button>
        </div>
      </Modal>

      {/* Litige */}
      <Modal isOpen={modal?.type === "dispute"} onClose={close} title="Signaler un problème">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">La mission passe en litige et l'argent reste bloqué. Un administrateur examine la situation et décide du remboursement ou du versement.</p>
          <textarea rows={4} className="input-field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Décrivez le problème (10 caractères minimum)" />
          <button onClick={() => disputeM.mutate({ id: m.id, data: { reason: text } })} disabled={text.trim().length < 10 || disputeM.isPending} className="btn-danger w-full">Ouvrir un litige</button>
        </div>
      </Modal>

      {/* Avis */}
      <Modal isOpen={modal?.type === "review"} onClose={close} title="Laisser un avis">
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <StarRating value={rating} onChange={setRating} size="lg" />
            <span className="text-sm text-gray-500">{["", "Très décevant", "Décevant", "Correct", "Bien", "Excellent"][rating]}</span>
          </div>
          <textarea rows={4} className="input-field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Racontez votre expérience (facultatif)" />
          <button
            onClick={() => reviewM.mutate({
              mission_id: m.id,
              target_id: String(m.client_id) === String(user?.id) ? m.professional_id : m.client_id,
              rating,
              comment: text || undefined,
            })}
            disabled={reviewM.isPending}
            className="btn-primary w-full"
          >
            Publier l'avis
          </button>
        </div>
      </Modal>
    </div>
  );
}
