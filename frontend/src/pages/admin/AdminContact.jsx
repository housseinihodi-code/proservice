import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Mail, CheckCircle, RotateCcw, Inbox } from "lucide-react";
import { adminAPI } from "../../services/api";
import Loader from "../../components/common/Loader";
import { AdminHeader, Pagination } from "../../components/admin/AdminLayout";
import { apiError, CONTACT_SUBJECTS } from "../../constants/locale";

const TABS = [["NEW", "À traiter"], ["HANDLED", "Traités"], ["", "Tous"]];

export default function AdminContact() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("NEW");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-contact", status, page],
    queryFn: () => adminAPI.listContact({ status: status || undefined, page, size: 20 }).then((r) => r.data),
    keepPreviousData: true,
  });

  const toggle = useMutation({
    mutationFn: (id) => adminAPI.toggleContactHandled(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-contact"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success(res.data.message);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div>
      <AdminHeader title="Messages de contact" subtitle="Les messages envoyés depuis la page Contact du site" />

      <div className="flex gap-2 mb-4">
        {TABS.map(([v, l]) => (
          <button
            key={v}
            onClick={() => { setStatus(v); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${status === v ? "bg-primary-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading ? <Loader /> : !data?.items?.length ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-900">{status === "NEW" ? "Aucun message en attente" : "Aucun message"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.items.map((m) => {
            const handled = m.status === "HANDLED";
            const reply = `mailto:${m.email}?subject=${encodeURIComponent(`Re : ${CONTACT_SUBJECTS[m.subject] || "Votre message"} — ProServices`)}`;
            return (
              <div key={m.id} className={`bg-white rounded-2xl border p-5 ${handled ? "border-gray-200 opacity-75" : "border-primary-200"}`}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{m.name} <span className="font-normal text-gray-500 text-sm">· {m.email}</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(m.created_at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
                    </p>
                  </div>
                  <span className={`badge ${handled ? "badge-gray" : "badge-blue"} self-start`}>{CONTACT_SUBJECTS[m.subject] || m.subject}</span>
                </div>
                <p className="text-gray-700 bg-gray-50 rounded-xl p-3 mb-4 whitespace-pre-line">{m.message}</p>
                <div className="flex flex-wrap gap-2">
                  <a href={reply} className="btn-secondary text-sm flex items-center gap-2"><Mail className="w-4 h-4" /> Répondre par email</a>
                  <button onClick={() => toggle.mutate(m.id)} disabled={toggle.isPending} className={`text-sm flex items-center gap-2 ${handled ? "btn-secondary" : "btn-primary"}`}>
                    {handled ? <><RotateCcw className="w-4 h-4" /> Remettre à traiter</> : <><CheckCircle className="w-4 h-4" /> Marquer comme traité</>}
                  </button>
                </div>
              </div>
            );
          })}
          <Pagination page={page} pages={data.pages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
