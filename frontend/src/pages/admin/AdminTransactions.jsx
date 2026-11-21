import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, TrendingUp } from "lucide-react";
import { transactionsAPI } from "../../services/api";
import Loader from "../../components/common/Loader";

const METHOD_LABELS = { MTN_MOMO: "MTN MoMo", ORANGE_MONEY: "Orange Money", CARD: "Carte", BANK_TRANSFER: "Virement", WALLET: "Portefeuille" };
const STATUS_STYLES = { PENDING: "badge-yellow", PROCESSING: "badge-blue", COMPLETED: "badge-green", FAILED: "badge-red", REFUNDED: "badge-gray" };
const STATUS_LABELS = { PENDING: "En attente", PROCESSING: "En cours", COMPLETED: "Complété", FAILED: "Échoué", REFUNDED: "Remboursé" };

export default function AdminTransactions() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-transactions", page],
    queryFn: () => transactionsAPI.list({ page, size: 25 }).then((r) => r.data),
    keepPreviousData: true,
  });

  const completed = data?.items?.filter((t) => t.status === "COMPLETED") || [];
  const totalVolume = completed.reduce((s, t) => s + t.amount, 0);
  const totalCommission = completed.reduce((s, t) => s + t.commission, 0);

  if (isLoading) return <Loader />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Transactions</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center"><CreditCard className="w-6 h-6 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{data?.total || 0}</p><p className="text-sm text-gray-500">Transactions totales</p></div>
        </div>
        <div className="card p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6 text-green-600" /></div>
          <div><p className="text-2xl font-bold">{totalVolume.toLocaleString("fr-FR")}</p><p className="text-sm text-gray-500">Volume €</p></div>
        </div>
        <div className="card p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center"><TrendingUp className="w-6 h-6 text-purple-600" /></div>
          <div><p className="text-2xl font-bold">{totalCommission.toLocaleString("fr-FR")}</p><p className="text-sm text-gray-500">Commissions €</p></div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Date</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Mode</th>
                <th className="text-right px-6 py-3 text-gray-500 font-medium">Montant</th>
                <th className="text-right px-6 py-3 text-gray-500 font-medium">Commission</th>
                <th className="text-right px-6 py-3 text-gray-500 font-medium">Net</th>
                <th className="text-center px-6 py-3 text-gray-500 font-medium">Statut</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Référence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.items?.map((txn) => (
                <tr key={txn.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-600">{new Date(txn.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="px-6 py-4 font-medium">{METHOD_LABELS[txn.payment_method] || txn.payment_method}</td>
                  <td className="px-6 py-4 text-right">{txn.amount?.toLocaleString("fr-FR")} €</td>
                  <td className="px-6 py-4 text-right text-purple-700">{txn.commission?.toLocaleString("fr-FR")} €</td>
                  <td className="px-6 py-4 text-right text-green-700 font-semibold">{txn.net_amount?.toLocaleString("fr-FR")} €</td>
                  <td className="px-6 py-4 text-center"><span className={`badge ${STATUS_STYLES[txn.status] || "badge-gray"}`}>{STATUS_LABELS[txn.status] || txn.status}</span></td>
                  <td className="px-6 py-4 text-xs text-gray-400 font-mono">{txn.operator_reference || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {page} / {data.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50">Précédent</button>
              <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50">Suivant</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
