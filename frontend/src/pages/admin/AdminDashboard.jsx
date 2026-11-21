import { Link } from "react-router-dom";
import { AlertTriangle, FileText, Star, ArrowRight, CheckCircle } from "lucide-react";
import Loader from "../../components/common/Loader";
import { AdminHeader, useAdminStats, userAvatar } from "../../components/admin/AdminLayout";
import { formatMoney } from "../../constants/locale";

const ROLE_LABELS = { PROFESSIONAL: "Professionnel", CLIENT: "Client", ADMIN: "Admin", SUPER_ADMIN: "Super Admin" };

function Kpi({ label, value, sub, to }) {
  const body = (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 h-full hover:border-primary-300 transition-colors">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function AdminDashboard() {
  const { data: s, isLoading } = useAdminStats();
  if (isLoading || !s) return <Loader />;

  const todo = [
    { n: s.missions.disputed, label: "litige(s) à trancher", to: "/admin/missions", icon: AlertTriangle, color: "text-red-600 bg-red-50" },
    { n: s.documents.pending, label: "document(s) à vérifier", to: "/admin/documents", icon: FileText, color: "text-yellow-700 bg-yellow-50" },
    { n: s.evaluations.flagged, label: "avis signalé(s)", to: "/admin/avis", icon: Star, color: "text-accent-600 bg-accent-50" },
  ];
  const nothingToDo = todo.every((t) => !t.n);

  return (
    <div>
      <AdminHeader title="Vue d'ensemble" subtitle="L'activité de la plateforme ProServices en un coup d'œil" />

      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">À traiter</h2>
        {nothingToDo ? (
          <p className="flex items-center gap-2 text-green-700 text-sm"><CheckCircle className="w-4 h-4" /> Rien en attente, tout est à jour.</p>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            {todo.map(({ n, label, to, icon: Icon, color }) => (
              <Link key={to} to={to} className={`flex items-center gap-3 rounded-xl p-4 ${n ? color : "bg-gray-50 text-gray-400"} hover:opacity-90`}>
                <Icon className="w-5 h-5" />
                <span className="text-2xl font-bold">{n}</span>
                <span className="text-sm font-medium flex-1">{label}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Utilisateurs</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi label="Inscrits" value={s.users.total} sub={`+${s.users.new_this_week} cette semaine`} to="/admin/utilisateurs" />
        <Kpi label="Professionnels" value={s.users.professionals} sub={`${s.users.verified} vérifié(s)`} to="/admin/professionnels" />
        <Kpi label="Clients" value={s.users.clients} />
        <Kpi label="Comptes suspendus" value={s.users.suspended} sub={`${s.users.admins} administrateur(s)`} />
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Activité</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi label="Missions" value={s.missions.total} sub={`${s.missions.pending} en attente · ${s.missions.in_progress} en cours`} to="/admin/missions" />
        <Kpi label="Missions terminées" value={s.missions.completed} />
        <Kpi label="Offres ouvertes" value={s.offers.open} sub={`${s.offers.applications} candidature(s) au total`} to="/admin/offres" />
        <Kpi label="Métiers actifs" value={s.trades.active} sub={`sur ${s.trades.total}`} to="/admin/metiers" />
      </div>

      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">Finances</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Kpi label="Fonds en séquestre" value={formatMoney(s.missions.escrow_amount)} sub="Payés, en attente de validation" />
        <Kpi label="Volume versé" value={formatMoney(s.transactions.total_amount)} to="/admin/transactions" />
        <Kpi label="Commissions perçues" value={formatMoney(s.transactions.total_commission)} />
        <Kpi label="Transactions" value={s.transactions.total} sub={`${s.transactions.completed} terminée(s)`} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Dernières inscriptions</h2>
          <Link to="/admin/utilisateurs" className="text-sm text-primary-700 hover:underline">Tout voir</Link>
        </div>
        <ul className="divide-y divide-gray-50">
          {s.recent_users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 px-5 py-3">
              <img src={userAvatar(u)} alt="" className="w-8 h-8 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{u.first_name} {u.last_name}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
              <span className="badge badge-gray">{ROLE_LABELS[u.role] || u.role}</span>
              <span className="text-xs text-gray-400 hidden sm:block">{new Date(u.created_at).toLocaleDateString("fr-FR")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
