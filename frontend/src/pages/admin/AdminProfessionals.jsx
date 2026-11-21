import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Search, Star, Check } from "lucide-react";
import { adminAPI } from "../../services/api";
import Loader from "../../components/common/Loader";
import { AdminHeader, Pagination, userAvatar } from "../../components/admin/AdminLayout";
import { formatLocation, formatMoney, apiError } from "../../constants/locale";

export default function AdminProfessionals() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-pros", page, search],
    queryFn: () => adminAPI.listProfessionals({ page, size: 20, search: search || undefined }).then((r) => r.data),
    keepPreviousData: true,
  });

  const opts = {
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ["admin-pros"] }); queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }); toast.success(res.data.message); },
    onError: (e) => toast.error(apiError(e)),
  };
  const featured = useMutation({ mutationFn: (id) => adminAPI.toggleFeatured(id), ...opts });
  const verified = useMutation({ mutationFn: (id) => adminAPI.toggleUserVerified(id), ...opts });

  return (
    <div>
      <AdminHeader title="Professionnels" subtitle="Vérifiez les profils et choisissez ceux mis en avant sur la plateforme" />
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input className="input-field pl-9" placeholder="Nom ou email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {isLoading ? <Loader /> : data?.items?.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Aucun professionnel.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {data?.items?.map((p) => (
              <li key={p.id} className="flex flex-col md:flex-row md:items-center gap-4 p-5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img src={userAvatar(p.user, 48)} alt="" className="w-12 h-12 rounded-full" />
                  <div className="min-w-0">
                    <Link to={`/professionnels/${p.id}`} className="font-semibold text-gray-900 hover:text-primary-700">{p.user?.first_name} {p.user?.last_name}</Link>
                    <p className="text-sm text-accent-600 truncate">{p.trades?.length ? p.trades.join(" · ") : <span className="text-gray-400">Aucun métier renseigné</span>}</p>
                    <p className="text-xs text-gray-400">
                      {formatLocation(p.user?.city, p.user?.country) || "—"} · {p.hourly_rate ? `${formatMoney(p.hourly_rate)}/h` : "sur devis"}
                      {!p.user?.is_active && <span className="text-red-500"> · compte suspendu</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-700 md:w-28">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> {(p.reputation_score || 0).toFixed(1)} <span className="text-gray-400">({p.total_reviews})</span>
                </div>
                {p.pending_documents > 0 && (
                  <Link to="/admin/documents" className="badge badge-yellow">{p.pending_documents} document(s) à vérifier</Link>
                )}
                <div className="flex gap-2">
                  <button onClick={() => verified.mutate(p.user_id)} className={`text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 ${p.user?.is_verified ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700"}`}>
                    <Check className="w-3.5 h-3.5" /> {p.user?.is_verified ? "Vérifié" : "Vérifier"}
                  </button>
                  <button onClick={() => featured.mutate(p.id)} className={`text-xs font-medium px-3 py-1.5 rounded-lg ${p.is_featured ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600 hover:bg-yellow-50"}`}>
                    {p.is_featured ? "Mis en avant" : "Mettre en avant"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={data?.pages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
