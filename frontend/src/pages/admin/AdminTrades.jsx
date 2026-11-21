import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Plus, Pencil, Trash2, Search, Eye, EyeOff, Check, X } from "lucide-react";
import { adminAPI } from "../../services/api";
import Loader from "../../components/common/Loader";
import { AdminHeader } from "../../components/admin/AdminLayout";
import { DOMAINS, groupTradesByDomain, apiError } from "../../constants/locale";

export default function AdminTrades() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [domain, setDomain] = useState(DOMAINS[0]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null); // { id, name }

  const { data: trades, isLoading } = useQuery({
    queryKey: ["admin-trades"],
    queryFn: () => adminAPI.listTrades().then((r) => r.data),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-trades"] });
    queryClient.invalidateQueries({ queryKey: ["trades"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };
  const onError = (e) => toast.error(apiError(e));

  const create = useMutation({
    mutationFn: () => adminAPI.createTrade({ name: name.trim(), domain }),
    onSuccess: () => { refresh(); toast.success(`Métier « ${name.trim()} » ajouté`); setName(""); },
    onError,
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => adminAPI.updateTrade(id, data),
    onSuccess: () => { refresh(); setEditing(null); toast.success("Métier mis à jour"); },
    onError,
  });
  const remove = useMutation({
    mutationFn: (id) => adminAPI.deleteTrade(id),
    onSuccess: () => { refresh(); toast.success("Métier supprimé"); },
    onError,
  });

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groupTradesByDomain((trades || []).filter((t) => !q || t.name.toLowerCase().includes(q)));
  }, [trades, query]);
  const domainOptions = [...new Set([...DOMAINS, ...(trades || []).map((t) => t.domain)])];

  return (
    <div>
      <AdminHeader title="Métiers" subtitle={`${trades?.length ?? "…"} métiers. Les professionnels choisissent les leurs dans cette liste.`} />

      <form onSubmit={(e) => { e.preventDefault(); if (name.trim().length >= 2) create.mutate(); }} className="bg-white rounded-2xl border border-gray-200 p-5 mb-6 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <div>
          <label className="form-label">Nouveau métier</label>
          <input className="input-field" placeholder="Ex : Serrurier" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Domaine</label>
          <select className="input-field" value={domain} onChange={(e) => setDomain(e.target.value)}>
            {domainOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <button type="submit" disabled={name.trim().length < 2 || create.isPending} className="btn-primary flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </form>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input className="input-field pl-9" placeholder="Filtrer les métiers..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {isLoading ? <Loader /> : (
        <div className="grid md:grid-cols-2 gap-5">
          {groups.map((g) => (
            <div key={g.domain} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex justify-between">
                <h2 className="font-semibold text-gray-900">{g.domain}</h2>
                <span className="text-xs text-gray-500">{g.trades.length}</span>
              </div>
              <ul className="divide-y divide-gray-50">
                {g.trades.map((t) => (
                  <li key={t.id} className={`flex items-center gap-2 px-5 py-2 text-sm ${t.is_active ? "" : "opacity-50"}`}>
                    {editing?.id === t.id ? (
                      <form className="flex-1 flex gap-2" onSubmit={(e) => { e.preventDefault(); update.mutate({ id: t.id, data: { name: editing.name } }); }}>
                        <input autoFocus className="input-field py-1" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                        <button type="submit" className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Enregistrer"><Check className="w-4 h-4" /></button>
                        <button type="button" onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg" title="Annuler"><X className="w-4 h-4" /></button>
                      </form>
                    ) : (
                      <>
                        <span className="flex-1 text-gray-800">{t.name}{!t.is_active && <span className="text-xs text-gray-500"> (masqué)</span>}</span>
                        <span className="text-xs text-gray-400 w-16 text-right">{t.professionals_count} pro(s)</span>
                        <button onClick={() => setEditing({ id: t.id, name: t.name })} className="p-1.5 text-gray-400 hover:text-primary-700 hover:bg-gray-100 rounded-lg" title="Renommer"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => update.mutate({ id: t.id, data: { is_active: !t.is_active } })} className="p-1.5 text-gray-400 hover:text-primary-700 hover:bg-gray-100 rounded-lg" title={t.is_active ? "Masquer" : "Afficher"}>
                          {t.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => window.confirm(t.professionals_count ? `${t.professionals_count} professionnel(s) utilisent « ${t.name} ». Le supprimer quand même ?` : `Supprimer « ${t.name} » ?`) && remove.mutate(t.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
