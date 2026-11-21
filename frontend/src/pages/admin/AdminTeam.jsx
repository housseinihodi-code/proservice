import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { UserPlus } from "lucide-react";
import { adminAPI } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import { AdminHeader, Pagination, userAvatar } from "../../components/admin/AdminLayout";
import { apiError } from "../../constants/locale";

const ACTIONS = {
  ADD_ADMIN: "a ajouté un administrateur",
  CHANGE_ROLE: "a changé un rôle",
  SUSPEND_USER: "a suspendu un compte",
  ACTIVATE_USER: "a réactivé un compte",
  VERIFY_USER: "a vérifié un profil",
  UNVERIFY_USER: "a retiré une vérification",
  FEATURE_PRO: "a mis un profil en avant",
  UNFEATURE_PRO: "a retiré une mise en avant",
  RESOLVE_DISPUTE: "a tranché un litige",
  HIDE_REVIEW: "a masqué un avis",
  KEEP_REVIEW: "a conservé un avis signalé",
  APPROVE_DOC: "a approuvé un document",
  REJECT_DOC: "a rejeté un document",
  CLOSE_OFFER: "a retiré une offre",
};

export default function AdminTeam() {
  const queryClient = useQueryClient();
  const { user: me } = useAuthStore();
  const isSuper = me?.role === "SUPER_ADMIN";
  const [addOpen, setAddOpen] = useState(false);
  const [page, setPage] = useState(1);

  const { data: team, isLoading } = useQuery({
    queryKey: ["admin-team"],
    queryFn: () => adminAPI.listTeam().then((r) => r.data),
  });
  const { data: logs } = useQuery({
    queryKey: ["admin-logs", page],
    queryFn: () => adminAPI.getLogs({ page, size: 20 }).then((r) => r.data),
    keepPreviousData: true,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: { role: "ADMIN" } });
  const add = useMutation({
    mutationFn: (data) => adminAPI.addTeamMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-team"] });
      queryClient.invalidateQueries({ queryKey: ["admin-logs"] });
      toast.success("Administrateur ajouté");
      setAddOpen(false);
      reset();
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div>
      <AdminHeader title="Équipe d'administration" subtitle="Les membres qui gèrent la plateforme et l'historique de leurs actions">
        {isSuper && (
          <button onClick={() => setAddOpen(true)} className="btn-primary flex items-center gap-2"><UserPlus className="w-4 h-4" /> Ajouter un membre</button>
        )}
      </AdminHeader>

      {isLoading ? <Loader /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {team?.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
              <img src={userAvatar(m, 48)} alt="" className="w-12 h-12 rounded-full" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 truncate">{m.first_name} {m.last_name}{m.id === me?.id && <span className="text-gray-400 font-normal"> (vous)</span>}</p>
                <p className="text-xs text-gray-500 truncate">{m.email}</p>
                <span className={`badge mt-1 ${m.role === "SUPER_ADMIN" ? "badge-red" : "badge-blue"}`}>{m.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}</span>
                {!m.is_active && <span className="badge badge-gray mt-1 ml-1">Suspendu</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 mb-6 p-5 text-sm text-gray-600">
        <p className="font-semibold text-gray-900 mb-2">Qui peut faire quoi ?</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Admin</strong> : modère les utilisateurs, avis, offres et documents, tranche les litiges, gère les métiers.</li>
          <li><strong>Super Admin</strong> : tout ce que fait un Admin, plus l'ajout de membres et le changement des rôles.</li>
        </ul>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100"><h2 className="font-semibold text-gray-900">Journal des actions</h2></div>
        {!logs?.items?.length ? (
          <p className="text-center text-gray-500 py-10 text-sm">Aucune action enregistrée pour l'instant.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {logs.items.map((l) => (
              <li key={l.id} className="px-5 py-3 text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <span className="text-xs text-gray-400 sm:w-36 flex-shrink-0">{new Date(l.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                <span className="flex-1">
                  <strong className="text-gray-900">{l.admin_name}</strong> {ACTIONS[l.action] || l.action}
                  {l.details && <span className="text-gray-500"> · {l.details}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} pages={logs?.pages} onChange={setPage} />
      </div>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Ajouter un membre à l'équipe">
        <form onSubmit={handleSubmit((d) => add.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Prénom</label>
              <input className="input-field" {...register("first_name", { required: true, minLength: 2 })} />
            </div>
            <div>
              <label className="form-label">Nom</label>
              <input className="input-field" {...register("last_name", { required: true, minLength: 2 })} />
            </div>
          </div>
          <div>
            <label className="form-label">Email</label>
            <input type="email" className="input-field" {...register("email", { required: true })} />
          </div>
          <div>
            <label className="form-label">Mot de passe provisoire</label>
            <input type="password" className="input-field" {...register("password", { required: true, minLength: { value: 8, message: "8 caractères minimum" } })} />
            <p className="text-xs text-gray-500 mt-1">{errors.password?.message || "8 caractères minimum, avec une majuscule et un chiffre. Transmettez-le à la personne de façon sûre."}</p>
          </div>
          <div>
            <label className="form-label">Rôle</label>
            <select className="input-field" {...register("role")}>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <button type="submit" disabled={add.isPending} className="btn-primary w-full">{add.isPending ? "Ajout..." : "Ajouter"}</button>
        </form>
      </Modal>
    </div>
  );
}
