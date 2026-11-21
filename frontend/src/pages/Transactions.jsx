import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { transactionsAPI } from "../services/api";
import { useAuthStore } from "../store/authStore";
import Loader from "../components/common/Loader";

const METHOD_LABELS = { MTN_MOMO: "MTN MoMo", ORANGE_MONEY: "Orange Money", CARD: "Carte bancaire", BANK_TRANSFER: "Virement", WALLET: "Portefeuille" };
const STATUS_STYLES = { PENDING: "badge-yellow", PROCESSING: "badge-blue", COMPLETED: "badge-green", FAILED: "badge-red", REFUNDED: "badge-gray" };
const STATUS_LABELS = { PENDING: "En attente", PROCESSING: "En cours", COMPLETED: "Payé", FAILED: "Échoué", REFUNDED: "Remboursé" };

export default function Transactions() {
  const { user } = useAuthStore();
  const isPro = user?.role === "PROFESSIONAL";
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", page],
    queryFn: () => transactionsAPI.list({ page, size: 20 }).then((r) => r.data),
    keepPreviousData: true,
  });

  const completedTxns = data?.items?.filter((t) => t.status === "COMPLETED") || [];
  const totalAmount = completedTxns.reduce((s, t) => s + (isPro ? t.net_amount : t.amount), 0);
  const totalCommission = completedTxns.reduce((s, t) => s + t.commission, 0);

  if (isLoading) return <Loader />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Transactions</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            {isPro ? <TrendingUp className="w-6 h-6 text-green-600" /> : <TrendingDown className="w-6 h-6 text-blue-600" />}
            <span className="text-sm text-gray-500">{isPro ? "Revenus nets" : "Total dépensé"}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalAmount.toLocaleString("fr-FR")} <span className="text-sm font-normal text-gray-500">€</span></p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <CreditCard className="w-6 h-6 text-purple-600" />
            <span className="text-sm text-gray-500">Commissions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalCommission.toLocaleString("fr-FR")} <span className="text-sm font-normal text-gray-500">€</span></p>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-orange-500" />
            <span className="text-sm text-gray-500">Transactions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data?.total || 0}</p>
        </div>
      </div>

      {/* Transactions table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Historique des transactions</h2>
        </div>
        {data?.items?.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Aucune transaction</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Date</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Mode</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Montant</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Commission</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">{isPro ? "Net reçu" : "Payé"}</th>
                  <th className="text-center px-6 py-3 text-gray-500 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data?.items?.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-600">{new Date(txn.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{METHOD_LABELS[txn.payment_method] || txn.payment_method}</td>
                    <td className="px-6 py-4 text-right font-medium">{txn.amount?.toLocaleString("fr-FR")} €</td>
                    <td className="px-6 py-4 text-right text-red-600">-{txn.commission?.toLocaleString("fr-FR")} €</td>
                    <td className="px-6 py-4 text-right font-bold text-green-700">{txn.net_amount?.toLocaleString("fr-FR")} €</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`badge ${STATUS_STYLES[txn.status] || "badge-gray"}`}>{STATUS_LABELS[txn.status] || txn.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data?.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {page} sur {data.pages}</p>
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
