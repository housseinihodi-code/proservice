import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, BadgeCheck, Briefcase, ClipboardList, Star, FileText,
  CreditCard, Wrench, ShieldCheck, Mail,
} from "lucide-react";
import { adminAPI, mediaUrl } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminAPI.getDashboard().then((r) => r.data),
    refetchInterval: 60000,
  });
}

export default function AdminLayout() {
  const { user } = useAuthStore();
  const { data: stats } = useAdminStats();
  const { pathname } = useLocation();

  const links = [
    { to: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard, end: true },
    { to: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
    { to: "/admin/professionnels", label: "Professionnels", icon: BadgeCheck },
    { to: "/admin/missions", label: "Missions & litiges", icon: Briefcase, count: stats?.missions?.disputed },
    { to: "/admin/offres", label: "Offres", icon: ClipboardList },
    { to: "/admin/avis", label: "Avis signalés", icon: Star, count: stats?.evaluations?.flagged },
    { to: "/admin/documents", label: "Documents", icon: FileText, count: stats?.documents?.pending },
    { to: "/admin/transactions", label: "Transactions", icon: CreditCard },
    { to: "/admin/metiers", label: "Métiers", icon: Wrench },
    { to: "/admin/messages", label: "Messages de contact", icon: Mail, count: stats?.contact?.new },
    { to: "/admin/equipe", label: "Équipe & journal", icon: ShieldCheck },
  ];

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto px-4 py-6 lg:py-8 lg:grid lg:grid-cols-[230px_1fr] lg:gap-8">
        <aside className="mb-6 lg:mb-0">
          <div className="hidden lg:flex items-center gap-3 mb-6 px-3">
            <div className="w-10 h-10 rounded-xl bg-primary-900 text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-gray-900 leading-tight">Administration</p>
              <p className="text-xs text-gray-500">{user?.first_name} · {user?.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}</p>
            </div>
          </div>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 lg:sticky lg:top-24">
            {links.map(({ to, label, icon: Icon, end, count }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${isActive ? "bg-primary-900 text-white" : "text-gray-600 hover:bg-white hover:text-gray-900"}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {count > 0 && <span className="ml-2 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-accent-500 text-white text-xs font-bold flex items-center justify-center">{count}</span>}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">
          <div key={pathname} className="page-enter"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}

export function AdminHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
      <p className="text-sm text-gray-500">Page {page} / {pages}</p>
      <div className="flex gap-2">
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50">Précédent</button>
        <button onClick={() => onChange(Math.min(pages, page + 1))} disabled={page === pages} className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50">Suivant</button>
      </div>
    </div>
  );
}

export function userAvatar(u, size = 32) {
  return mediaUrl(u?.profile_picture_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${u?.first_name || ""} ${u?.last_name || ""}`)}&background=e5e7eb&color=374151&size=${size}`;
}
