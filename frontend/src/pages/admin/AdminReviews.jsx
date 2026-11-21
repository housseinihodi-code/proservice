import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CheckCircle } from "lucide-react";
import { adminAPI } from "../../services/api";
import Loader from "../../components/common/Loader";
import StarRating from "../../components/common/StarRating";
import { AdminHeader, userAvatar } from "../../components/admin/AdminLayout";
import { apiError } from "../../constants/locale";

export default function AdminReviews() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-flagged"],
    queryFn: () => adminAPI.getFlaggedEvaluations().then((r) => r.data),
  });
  const moderate = useMutation({
    mutationFn: ({ id, hide }) => adminAPI.moderateEvaluation(id, hide),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-flagged"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success(res.data.message);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div>
      <AdminHeader title="Avis signalés" subtitle="Un avis masqué n'est plus visible et ne compte plus dans la note du professionnel" />
      {isLoading ? <Loader /> : !data?.length ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="font-medium text-gray-900">Aucun avis signalé</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((e) => (
            <div key={e.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start gap-3 mb-3">
                <img src={userAvatar(e.author)} alt="" className="w-9 h-9 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <strong>{e.author?.first_name} {e.author?.last_name}</strong>
                    <span className="text-gray-500"> a noté </span>
                    <strong>{e.target?.first_name} {e.target?.last_name}</strong>
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StarRating value={e.rating} readonly size="sm" />
                    <span className="text-xs text-gray-400">{new Date(e.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
              </div>
              <p className="text-gray-700 bg-gray-50 rounded-xl p-3 mb-3">{e.comment || <em className="text-gray-400">Pas de commentaire</em>}</p>
              <p className="text-sm text-accent-700 mb-4"><strong>Motif du signalement :</strong> {e.flag_reason || "Non précisé"}</p>
              <div className="flex gap-2">
                <button onClick={() => moderate.mutate({ id: e.id, hide: false })} disabled={moderate.isPending} className="btn-secondary text-sm flex-1">Conserver l'avis</button>
                <button onClick={() => moderate.mutate({ id: e.id, hide: true })} disabled={moderate.isPending} className="btn-danger text-sm flex-1">Masquer l'avis</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
