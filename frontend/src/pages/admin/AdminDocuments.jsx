import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FileText, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { adminAPI, documentsAPI, openPrivateDocument } from "../../services/api";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import { apiError } from "../../constants/locale";

const TYPE_LABELS = { DIPLOMA: "Diplôme", CERTIFICATE: "Certificat", ID_CARD: "Pièce d'identité", OTHER: "Autre" };

export default function AdminDocuments() {
  const queryClient = useQueryClient();
  const [rejectModal, setRejectModal] = useState(null);
  const [reason, setReason] = useState("");

  const { data: docs, isLoading } = useQuery({
    queryKey: ["admin-pending-docs"],
    queryFn: () => adminAPI.getPendingDocuments().then((r) => r.data),
    refetchInterval: 30000,
  });

  const validateMutation = useMutation({
    mutationFn: ({ id, data }) => documentsAPI.validate(id, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-docs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success(vars.data.status === "APPROVED" ? "Document approuvé" : "Document rejeté");
      setRejectModal(null);
      setReason("");
    },
    onError: () => toast.error("Erreur lors de la validation"),
  });

  if (isLoading) return <Loader />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Validation des documents</h1>
          <p className="text-gray-500 mt-1">{docs?.length || 0} document(s) en attente de validation</p>
        </div>
      </div>

      {docs?.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Tout est à jour !</h3>
          <p className="text-gray-500">Aucun document en attente de validation</p>
        </div>
      ) : (
        <div className="space-y-4">
          {docs?.map((doc) => (
            <div key={doc.id} className="card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{doc.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{TYPE_LABELS[doc.type] || doc.type}</p>
                    <p className="text-xs text-gray-400 mt-1">Déposé le {new Date(doc.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openPrivateDocument(doc.id).catch((e) => toast.error(apiError(e)))} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Voir
                  </button>
                  <button
                    onClick={() => validateMutation.mutate({ id: doc.id, data: { status: "APPROVED" } })}
                    disabled={validateMutation.isPending}
                    className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Approuver
                  </button>
                  <button
                    onClick={() => setRejectModal(doc)}
                    className="flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Rejeter
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!rejectModal} onClose={() => setRejectModal(null)} title="Raison du rejet">
        <div className="space-y-4">
          <p className="text-gray-600">Pourquoi rejetez-vous le document <strong>"{rejectModal?.name}"</strong> ?</p>
          <textarea
            rows={4}
            className="input-field"
            placeholder="Ex: Document illisible, informations incorrectes, document expiré..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-3">
            <button onClick={() => setRejectModal(null)} className="btn-secondary flex-1">Annuler</button>
            <button
              onClick={() => validateMutation.mutate({ id: rejectModal.id, data: { status: "REJECTED", rejection_reason: reason } })}
              disabled={!reason.trim() || validateMutation.isPending}
              className="btn-danger flex-1"
            >
              Confirmer le rejet
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
