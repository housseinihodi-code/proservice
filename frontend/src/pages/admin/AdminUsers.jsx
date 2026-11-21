import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Search, Check } from "lucide-react";
import { adminAPI } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import { AdminHeader, Pagination, userAvatar } from "../../components/admin/AdminLayout";
import { formatLocation, formatMoney, apiError } from "../../constants/locale";

const ROLE_LABELS = { PROFESSIONAL: "Professionnel", CLIENT: "Client", ADMIN: "Admin", SUPER_ADMIN: "Super Admin" };
const ROLE_STYLES = { PROFESSIONAL: "badge-blue", CLIENT: "badge-gray", ADMIN: "badge-red", SUPER_ADMIN: "badge-red" };
const MISSION_LABELS = { PENDING: "En attente", IN_PROGRESS: "En cours", COMPLETED: "Terminée", CANCELLED: "Annulée", DISPUTED: "Litige" };

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { user: me } = useAuthStore();
  const isSuper = me?.role === "SUPER_ADMIN";
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [detailId, setDetailId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, search, roleFilter, statusFilter],
    queryFn: () => adminAPI.listUsers({
      page, size: 20, search: search || undefined, role: roleFilter || undefined,
      is_active: statusFilter === "" ? undefined : statusFilter === "active",
    }).then((r) => r.data),
    keepPreviousData: true,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["admin-user", detailId],
    queryFn: () => adminAPI.getUser(detailId).then((r) => r.data),
    enabled: !!detailId,
  });

  const mutationOpts = {
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success(res.data.message);
    },
    onError: (e) => toast.error(apiError(e)),
  };
  const toggleActive = useMutation({ mutationFn: (id) => adminAPI.toggleUserActive(id), ...mutationOpts });
  const toggleVerified = useMutation({ mutationFn: (id) => adminAPI.toggleUserVerified(id), ...mutationOpts });
  const changeRole = useMutation({ mutationFn: ({ id, role }) => adminAPI.changeUserRole(id, role), ...mutationOpts });

  const filterChange = (setter) => (e) => { setter(e.target.value); setPage(1); };

  return (
    <div>
      <AdminHeader title="Utilisateurs" subtitle={`${data?.total ?? "…"} compte(s)`} />

      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input className="input-field pl-9" placeholder="Nom ou email..." value={search} onChange={filterChange(setSearch)} />
        </div>
        <select className="input-field w-auto" value={roleFilter} onChange={filterChange(setRoleFilter)}>
          <option value="">Tous les rôles</option>
          {Object.entries(ROLE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
        </select>
        <select className="input-field w-auto" value={statusFilter} onChange={filterChange(setStatusFilter)}>
          <option value="">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="suspended">Suspendus</option>
        </select>
      </div>

      {isLoading ? <Loader /> : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Utilisateur</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Rôle</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Localisation</th>
                  <th className="text-center px-5 py-3 text-gray-500 font-medium">Vérifié</th>
                  <th className="text-center px-5 py-3 text-gray-500 font-medium">Statut</th>
                  <th className="text-right px-5 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.items?.map((u) => {
                  const isMe = u.id === me?.id;
                  const protectedTarget = u.role === "SUPER_ADMIN" && !isSuper;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <button onClick={() => setDetailId(u.id)} className="flex items-center gap-3 text-left">
                          <img src={userAvatar(u)} alt="" className="w-8 h-8 rounded-full" />
                          <div>
                            <p className="font-medium text-gray-900 hover:text-primary-700">{u.first_name} {u.last_name}{isMe && <span className="text-gray-400 font-normal"> (vous)</span>}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </div>
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        {isSuper && !isMe ? (
                          <select
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                            value={u.role}
                            onChange={(e) => window.confirm(`Passer ${u.first_name} en « ${ROLE_LABELS[e.target.value]} » ?`) && changeRole.mutate({ id: u.id, role: e.target.value })}
                          >
                            {Object.entries(ROLE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                          </select>
                        ) : (
                          <span className={`badge ${ROLE_STYLES[u.role] || "badge-gray"}`}>{ROLE_LABELS[u.role] || u.role}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{formatLocation(u.city, u.country) || "—"}</td>
                      <td className="px-5 py-3 text-center">
                        <button onClick={() => toggleVerified.mutate(u.id)} title={u.is_verified ? "Retirer la vérification" : "Marquer comme vérifié"} className={`inline-flex items-center justify-center w-7 h-7 rounded-full border ${u.is_verified ? "bg-green-50 border-green-200 text-green-600" : "border-gray-200 text-gray-300 hover:text-green-600"}`}>
                          <Check className="w-4 h-4" />
                        </button>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`badge ${u.is_active ? "badge-green" : "badge-red"}`}>{u.is_active ? "Actif" : "Suspendu"}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {!isMe && !protectedTarget && (
                          <button
                            onClick={() => window.confirm(u.is_active ? `Suspendre le compte de ${u.first_name} ? Il ne pourra plus se connecter.` : `Réactiver le compte de ${u.first_name} ?`) && toggleActive.mutate(u.id)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg ${u.is_active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}
                          >
                            {u.is_active ? "Suspendre" : "Réactiver"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={data?.pages} onChange={setPage} />
        </div>
      )}

      <Modal isOpen={!!detailId} onClose={() => setDetailId(null)} title="Fiche utilisateur" size="lg">
        {detailLoading || !detail ? <Loader /> : (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <img src={userAvatar(detail.user, 64)} alt="" className="w-16 h-16 rounded-full" />
              <div>
                <p className="text-lg font-semibold text-gray-900">{detail.user.first_name} {detail.user.last_name}</p>
                <p className="text-sm text-gray-500">{detail.user.email}{detail.user.phone ? ` · ${detail.user.phone}` : ""}</p>
                <p className="text-xs text-gray-400">Inscrit le {new Date(detail.user.created_at).toLocaleDateString("fr-FR")} · {formatLocation(detail.user.city, detail.user.country) || "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[["Missions", detail.missions_count], ["Offres", detail.offers_count], ["Avis reçus", detail.evaluations_received], ["Portefeuille", formatMoney(detail.wallet_balance)]].map(([l, v]) => (
                <div key={l} className="bg-gray-50 rounded-xl p-3"><p className="font-bold text-gray-900">{v}</p><p className="text-xs text-gray-500">{l}</p></div>
              ))}
            </div>
            {detail.profile && (
              <div className="text-sm space-y-1">
                <p><span className="text-gray-500">Métiers :</span> {detail.profile.trades?.join(", ") || "—"}</p>
                <p><span className="text-gray-500">Note :</span> {detail.profile.reputation_score?.toFixed(1)} / 5 ({detail.profile.total_reviews} avis)</p>
                <p><span className="text-gray-500">Tarif :</span> {detail.profile.hourly_rate ? `${formatMoney(detail.profile.hourly_rate)} / h` : "—"}</p>
              </div>
            )}
            {detail.missions.length > 0 && (
              <div>
                <p className="font-medium text-gray-900 mb-2">Dernières missions</p>
                <ul className="divide-y divide-gray-100 text-sm border border-gray-100 rounded-xl">
                  {detail.missions.map((m) => (
                    <li key={m.id} className="flex justify-between gap-3 px-3 py-2">
                      <span className="truncate">{m.title}</span>
                      <span className="text-gray-500 whitespace-nowrap">{formatMoney(m.amount)} · {MISSION_LABELS[m.mission_status]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
