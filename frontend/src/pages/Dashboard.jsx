import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Briefcase, MessageSquare, Star, CreditCard, Plus, ArrowRight, Edit3, Search, ClipboardList, Wallet } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { missionsAPI, messagesAPI, transactionsAPI } from "../services/api";
import Loader from "../components/common/Loader";

function StatCard({ icon, label, value, color }) {
  return (
    <div className="card p-6 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const isPro = user?.role === "PROFESSIONAL";

  const { data: missions, isLoading: missionsLoading } = useQuery({
    queryKey: ["missions"],
    queryFn: () => missionsAPI.list({ page: 1, size: 5 }).then((r) => r.data),
  });

  const { data: unread } = useQuery({
    queryKey: ["unread-messages"],
    queryFn: () => messagesAPI.getUnreadCount().then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: transactions } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => transactionsAPI.list({ page: 1, size: 5 }).then((r) => r.data),
  });

  if (missionsLoading) return <Loader />;

  const totalRevenue = transactions?.items?.filter((t) => t.status === "COMPLETED").reduce((sum, t) => sum + (isPro ? t.net_amount : t.amount), 0) || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.first_name}</h1>
          <p className="text-gray-500">Voici un aperçu de votre activité</p>
        </div>
        {!isPro ? (
          <Link to="/recherche" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nouvelle mission
          </Link>
        ) : (
          <Link to="/offres" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Voir les offres
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Briefcase className="w-6 h-6 text-blue-600" />} label="Missions" value={missions?.total || 0} color="bg-blue-100" />
        <StatCard icon={<MessageSquare className="w-6 h-6 text-purple-600" />} label="Messages non lus" value={unread?.unread_count || 0} color="bg-purple-100" />
        <StatCard icon={<CreditCard className="w-6 h-6 text-green-600" />} label={isPro ? "Revenus (€)" : "Dépenses (€)"} value={totalRevenue.toLocaleString("fr-FR")} color="bg-green-100" />
        <StatCard icon={<Star className="w-6 h-6 text-yellow-600" />} label="Évaluations" value="—" color="bg-yellow-100" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent missions */}
        <div className="card">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Missions récentes</h2>
            <Link to="/missions" className="text-primary-600 text-sm hover:underline flex items-center gap-1">
              Tout voir <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {missions?.items?.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Aucune mission pour l'instant</div>
            ) : (
              missions?.items?.map((mission) => (
                <div key={mission.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{mission.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{mission.amount?.toLocaleString("fr-FR")} €</p>
                    </div>
                    <span className={`badge flex-shrink-0 ${
                      mission.mission_status === "COMPLETED" ? "badge-green" :
                      mission.mission_status === "IN_PROGRESS" ? "badge-blue" :
                      mission.mission_status === "DISPUTED" ? "badge-red" : "badge-gray"
                    }`}>
                      {mission.mission_status === "PENDING" ? "En attente" :
                       mission.mission_status === "IN_PROGRESS" ? "En cours" :
                       mission.mission_status === "COMPLETED" ? "Terminée" :
                       mission.mission_status === "CANCELLED" ? "Annulée" : "Litige"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="card">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Transactions récentes</h2>
            <Link to="/transactions" className="text-primary-600 text-sm hover:underline flex items-center gap-1">
              Tout voir <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {transactions?.items?.length === 0 ? (
              <div className="p-8 text-center text-gray-400">Aucune transaction</div>
            ) : (
              transactions?.items?.map((txn) => (
                <div key={txn.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{txn.payment_method?.replace("_", " ")}</p>
                    <p className="text-xs text-gray-500">{new Date(txn.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{txn.amount?.toLocaleString("fr-FR")} €</p>
                    <span className={`badge text-xs ${txn.status === "COMPLETED" ? "badge-green" : txn.status === "FAILED" ? "badge-red" : "badge-yellow"}`}>
                      {txn.status === "COMPLETED" ? "Payé" : txn.status === "FAILED" ? "Échoué" : "En cours"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: "/messages", icon: MessageSquare, label: "Messagerie" },
            { to: isPro ? "/profil/modifier" : "/recherche", icon: isPro ? Edit3 : Search, label: isPro ? "Mon profil" : "Chercher" },
            { to: "/offres", icon: ClipboardList, label: "Offres" },
            { to: "/transactions", icon: Wallet, label: "Paiements" },
          ].map((action) => (
            <Link key={action.to} to={action.to} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <action.icon className="w-6 h-6 text-primary-600" />
              <span className="text-sm text-gray-700 font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
