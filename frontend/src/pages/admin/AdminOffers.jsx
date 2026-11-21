import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import { adminAPI } from "../../services/api";
import Loader from "../../components/common/Loader";
import { AdminHeader, Pagination } from "../../components/admin/AdminLayout";
import { formatLocation, formatMoney, apiError } from "../../constants/locale";

const STATUS = { OPEN: ["Ouverte", "badge-green"], IN_PROGRESS: ["Attribuée", "badge-blue"], CLOSED: ["Clôturée", "badge-gray"], CANCELLED: ["Retirée", "badge-red"] };

export default function AdminOffers() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-offers", page, status, search],
    queryFn: () => adminAPI.listOffers({ page, size: 20, status: status || undefined, search: search || undefined }).then((r) => r.data),
    keepPreviousData: true,
  });

  const close = useMutation({
    mutationFn: (id) => adminAPI.closeOffer(id),
    onSuccess: (res) => { queryClient.invalidateQueries({ queryKey: ["admin-offers"] }); toast.success(res.data.message); },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div>
      <AdminHeader title="Offres" subtitle="Toutes les offres publiées par les clients ; retirez celles qui ne respectent pas les règles" />
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input className="input-field pl-9" placeholder="Titre de l'offre..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input-field w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {isLoading ? <Loader /> : data?.items?.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Aucune offre</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {data?.items?.map((o) => {
              const [label, badge] = STATUS[o.status] || STATUS.OPEN;
              return (
                <li key={o.id} className="p-5 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{o.title}</p>
                    <p className="text-sm text-gray-500 line-clamp-1">{o.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {o.client ? `${o.client.first_name} ${o.client.last_name}` : "—"} · {o.trade || o.domain} · {formatLocation(o.location_city, o.location_country) || "à distance"}
                      {(o.budget_min || o.budget_max) && ` · ${formatMoney(o.budget_min || 0)} – ${formatMoney(o.budget_max || 0)}`}
                      {` · ${o.applications_count} candidature(s) · le ${new Date(o.created_at).toLocaleDateString("fr-FR")}`}
                    </p>
                  </div>
                  <span className={`badge ${badge} self-start md:self-center`}>{label}</span>
                  {o.status === "OPEN" && (
                    <button onClick={() => window.confirm(`Retirer l'offre « ${o.title} » ?`) && close.mutate(o.id)} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 self-start md:self-center">
                      Retirer
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <Pagination page={page} pages={data?.pages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
