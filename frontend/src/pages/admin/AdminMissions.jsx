import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AlertTriangle, CheckCircle, ExternalLink, Search } from "lucide-react";
import { adminAPI } from "../../services/api";
import Loader from "../../components/common/Loader";
import { AdminHeader, Pagination, userAvatar } from "../../components/admin/AdminLayout";
import { formatMoney, apiError } from "../../constants/locale";

const STATUS = {
  PENDING: ["En attente", "badge-yellow"], IN_PROGRESS: ["En cours", "badge-blue"], COMPLETED: ["Terminée", "badge-green"],
  CANCELLED: ["Annulée", "badge-gray"], DISPUTED: ["Litige", "badge-red"],
};
const PAYMENT = { PENDING: "Non payée", IN_ESCROW: "En séquestre", RELEASED: "Versée", REFUNDED: "Remboursée" };

function Party({ label, u }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <img src={userAvatar(u)} alt="" className="w-7 h-7 rounded-full" />
      <div className="min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{u ? `${u.first_name} ${u.last_name}` : "—"}</p>
      </div>
    </div>
  );
}

function Disputes() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: () => adminAPI.getDisputedMissions().then((r) => r.data),
  });
  const resolve = useMutation({
    mutationFn: ({ id, favorClient }) => adminAPI.resolveDispute(id, favorClient),
    onSuccess: (res) => {
      ["admin-disputes", "admin-missions", "admin-dashboard"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      toast.success(res.data.message);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  if (isLoading) return <Loader />;
  if (!data?.length) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
        <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
        <p className="font-medium text-gray-900">Aucun litige en cours</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((m) => (
        <div key={m.id} className="bg-white rounded-2xl border border-red-200 p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
            <div>
              <p className="font-semibold text-gray-900">{m.title}</p>
              <p className="text-sm text-gray-500">{formatMoney(m.amount)} · paiement {PAYMENT[m.payment_status]?.toLowerCase()} · ouvert le {new Date(m.updated_at).toLocaleDateString("fr-FR")}</p>
            </div>
            <span className="badge badge-red flex items-center gap-1 self-start"><AlertTriangle className="w-3 h-3" /> Litige</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <Party label="Client" u={m.client} />
            <Party label="Professionnel" u={m.professional} />
          </div>
          <div className="bg-red-50 rounded-xl p-3 text-sm text-red-900 mb-3">
            <p className="font-medium mb-0.5">Motif ({m.disputed_by === m.client_id ? "signalé par le client" : m.disputed_by === m.professional_id ? "signalé par le professionnel" : "signalement"})</p>
            <p>{m.dispute_reason || m.notes || "Non précisé"}</p>
          </div>
          {m.delivered_at && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 mb-3">
              <p className="font-medium mb-0.5">Livraison du professionnel ({new Date(m.delivered_at).toLocaleDateString("fr-FR")})</p>
              <p className="whitespace-pre-line">{m.delivery_note}</p>
              {m.deliverable_url && <a href={m.deliverable_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-700 underline mt-1">Livrable <ExternalLink className="w-3 h-3" /></a>}
            </div>
          )}
          <p className="text-xs text-gray-500 mb-3">Pensez à consulter la messagerie entre les parties avant de trancher. La décision est définitive.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => window.confirm(`Rembourser ${formatMoney(m.amount)} au client et annuler la mission ?`) && resolve.mutate({ id: m.id, favorClient: true })}
              disabled={resolve.isPending}
              className="btn-secondary flex-1 text-sm"
            >
              Donner raison au client (remboursement)
            </button>
            <button
              onClick={() => window.confirm(`Verser ${formatMoney(m.net_amount)} au professionnel et clore la mission ?`) && resolve.mutate({ id: m.id, favorClient: false })}
              disabled={resolve.isPending}
              className="btn-primary flex-1 text-sm"
            >
              Donner raison au professionnel (paiement)
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AllMissions() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-missions", page, status, search],
    queryFn: () => adminAPI.listMissions({ page, size: 20, status: status || undefined, search: search || undefined }).then((r) => r.data),
    keepPreviousData: true,
  });

  return (
    <>
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input className="input-field pl-9" placeholder="Titre de la mission..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input-field w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {isLoading ? <Loader /> : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Mission</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Client → Pro</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Montant</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Paiement</th>
                  <th className="text-center px-5 py-3 text-gray-500 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.items?.map((m) => {
                  const [label, badge] = STATUS[m.mission_status] || STATUS.PENDING;
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{m.title}</p>
                        <p className="text-xs text-gray-400">Mise à jour le {new Date(m.updated_at).toLocaleDateString("fr-FR")}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{m.client?.first_name} {m.client?.last_name} → {m.professional?.first_name} {m.professional?.last_name}</td>
                      <td className="px-5 py-3 text-right font-medium">{formatMoney(m.amount)}</td>
                      <td className="px-5 py-3 text-gray-600">{PAYMENT[m.payment_status]}</td>
                      <td className="px-5 py-3 text-center"><span className={`badge ${badge}`}>{label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {data?.items?.length === 0 && <p className="text-center text-gray-500 py-10">Aucune mission</p>}
          <Pagination page={page} pages={data?.pages} onChange={setPage} />
        </div>
      )}
    </>
  );
}

export default function AdminMissions() {
  const [tab, setTab] = useState("disputes");
  return (
    <div>
      <AdminHeader title="Missions & litiges" subtitle="Suivez les missions et tranchez les désaccords entre clients et professionnels" />
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-full w-fit">
        {[["disputes", "Litiges"], ["all", "Toutes les missions"]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={`px-4 py-2 rounded-full text-sm font-medium ${tab === v ? "bg-white shadow-sm text-gray-900" : "text-gray-600"}`}>{l}</button>
        ))}
      </div>
      {tab === "disputes" ? <Disputes /> : <AllMissions />}
    </div>
  );
}
