import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, SlidersHorizontal, X, MapPin, Star } from "lucide-react";
import { professionalsAPI, tradesAPI } from "../services/api";
import ProfileCard from "../components/professional/ProfileCard";
import Loader from "../components/common/Loader";

import { COUNTRIES, DOMAINS, groupTradesByDomain } from "../constants/locale";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    domain: searchParams.get("domain") || "",
    trade: searchParams.get("trade") || "",
    country: searchParams.get("country") || "",
    city: searchParams.get("city") || "",
    min_rating: searchParams.get("min_rating") || "",
    max_rate: searchParams.get("max_rate") || "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["professionals", filters, page],
    queryFn: () => professionalsAPI.list({ ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")), page, size: 12 }).then((r) => r.data),
    keepPreviousData: true,
  });

  const { data: trades } = useQuery({
    queryKey: ["trades"],
    queryFn: () => tradesAPI.list().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const tradeGroups = groupTradesByDomain((trades || []).filter((t) => !filters.domain || t.domain === filters.domain));

  const setFilter = (key, value) => {
    setPage(1);
    setFilters((f) => {
      const next = { ...f, [key]: value };
      // Changer de domaine efface un métier qui n'en fait pas partie.
      if (key === "domain" && value && trades && f.trade && trades.find((t) => t.name === f.trade)?.domain !== value) next.trade = "";
      return next;
    });
  };
  const clearFilters = () => { setPage(1); setFilters({ search: "", domain: "", trade: "", country: "", city: "", min_rating: "", max_rate: "" }); };
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{filters.trade ? `Professionnels : ${filters.trade}` : "Trouver un professionnel"}</h1>
        <p className="text-gray-500">{data?.total || 0} professionnel(s) disponible(s)</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            className="input-field pl-10"
            placeholder="Métier, compétence, nom..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary flex items-center gap-2 ${activeCount > 0 ? "border-primary-500 text-primary-600" : ""}`}>
          <SlidersHorizontal className="w-4 h-4" />
          Filtres {activeCount > 0 && <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeCount}</span>}
        </button>
        {activeCount > 0 && (
          <button onClick={clearFilters} className="btn-secondary flex items-center gap-2 text-red-600">
            <X className="w-4 h-4" /> Réinitialiser
          </button>
        )}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="card p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="form-label">Domaine</label>
            <select className="input-field" value={filters.domain} onChange={(e) => setFilter("domain", e.target.value)}>
              <option value="">Tous les domaines</option>
              {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Métier</label>
            <select className="input-field" value={filters.trade} onChange={(e) => setFilter("trade", e.target.value)}>
              <option value="">Tous les métiers</option>
              {tradeGroups.map((g) => (
                <optgroup key={g.domain} label={g.domain}>
                  {g.trades.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Pays</label>
            <select className="input-field" value={filters.country} onChange={(e) => setFilter("country", e.target.value)}>
              <option value="">Tous les pays</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Ville</label>
            <input className="input-field" placeholder="Ex : Lyon" value={filters.city} onChange={(e) => setFilter("city", e.target.value)} />
          </div>
          <div>
            <label className="form-label">Note minimale</label>
            <select className="input-field" value={filters.min_rating} onChange={(e) => setFilter("min_rating", e.target.value)}>
              <option value="">Toutes les notes</option>
              {[4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}+ étoiles</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Tarif max (€/h)</label>
            <input type="number" className="input-field" placeholder="Ex : 50" value={filters.max_rate} onChange={(e) => setFilter("max_rate", e.target.value)} />
          </div>
        </div>
      )}

      {/* Domain quick filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {DOMAINS.map((d) => (
          <button key={d} onClick={() => setFilter("domain", filters.domain === d ? "" : d)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filters.domain === d ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {d}
          </button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <Loader />
      ) : data?.items?.length === 0 ? (
        <div className="text-center py-16">
          <SearchIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun résultat</h3>
          <p className="text-gray-500">Essayez de modifier vos critères de recherche</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.items?.map((professional) => (
              <ProfileCard key={professional.id} professional={professional} />
            ))}
          </div>

          {/* Pagination */}
          {data?.pages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-4 py-2 disabled:opacity-50">Précédent</button>
              {Array.from({ length: data.pages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map((p) => (
                <button key={p} onClick={() => setPage(p)} className={`px-4 py-2 rounded-lg font-medium transition-colors ${p === page ? "bg-primary-600 text-white" : "btn-secondary"}`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="btn-secondary px-4 py-2 disabled:opacity-50">Suivant</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
