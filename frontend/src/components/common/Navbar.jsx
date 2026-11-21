import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useScrolled } from "./Motion";
import { Menu, X, LogOut, User, Settings, LayoutDashboard, MessageSquare, Briefcase, Shield, ChevronDown, Wallet } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { mediaUrl } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";

export default function Navbar() {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(user?.role);
  const scrolled = useScrolled(10);
  const { pathname } = useLocation();
  useEffect(() => { setMobileOpen(false); setUserMenuOpen(false); setResourcesOpen(false); }, [pathname]);

  const navLinks = [
    { to: "/recherche", label: "Trouver un pro" },
    { to: "/metiers", label: "Métiers" },
    { to: "/offres", label: "Offres" },
  ];

  const resourceLinks = [
    { to: "/comment-ca-marche", label: "Comment ça marche" },
    { to: "/faq", label: "FAQ" },
    { to: "/a-propos", label: "À propos" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/80 backdrop-blur-xl border-b border-gray-200/70 shadow-soft" : "bg-white border-b border-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? "h-14" : "h-16"}`}>
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-2.5 font-display font-extrabold text-xl text-primary-900">
            <div className="w-9 h-9 bg-accent-gradient rounded-xl flex items-center justify-center text-white text-sm font-extrabold shadow-glow transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105">PS</div>
            <span className="hidden sm:block tracking-tight">Pro<span className="text-accent-500">Services</span></span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `relative px-4 py-2 text-sm font-semibold transition-colors after:absolute after:left-4 after:right-4 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-accent-500 after:origin-left after:transition-transform after:duration-300 ${isActive ? "text-primary-800 after:scale-x-100" : "text-gray-600 hover:text-gray-900 after:scale-x-0 hover:after:scale-x-100"}`}>
                {l.label}
              </NavLink>
            ))}
            <div className="relative" onMouseEnter={() => setResourcesOpen(true)} onMouseLeave={() => setResourcesOpen(false)}>
              <button className="px-4 py-2 rounded-full text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1">
                Ressources <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${resourcesOpen ? "rotate-180" : ""}`} />
              </button>
              {resourcesOpen && (
                <div className="absolute left-0 top-full pt-2 z-20"><div className="w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lift border border-gray-100 p-1.5 animate-scale-in origin-top-left">
                  {resourceLinks.map((r) => (
                    <Link key={r.to} to={r.to} className="block px-3.5 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-800 hover:translate-x-0.5 transition-all">{r.label}</Link>
                  ))}
                </div></div>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/messages" className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                  <MessageSquare className="w-5 h-5" />
                </Link>
                <div className="relative">
                  <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                    <img
                      src={mediaUrl(user.profile_picture_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.first_name + " " + user.last_name)}&background=2563eb&color=fff&size=32`}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-soft"
                    />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 leading-none">{user.first_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{user.role === "PROFESSIONAL" ? "Professionnel" : user.role === "CLIENT" ? "Client" : user.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}</p>
                    </div>
                  </button>

                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-60 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lift border border-gray-100 p-1.5 z-20 animate-scale-in origin-top-right">
                        <Link to="/tableau-de-bord" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-800 transition-colors">
                          <LayoutDashboard className="w-4 h-4 text-gray-400" /> Tableau de bord
                        </Link>
                        <Link to="/profil/modifier" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-800 transition-colors">
                          <Settings className="w-4 h-4 text-gray-400" /> Mon profil
                        </Link>
                        <Link to="/missions" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-800 transition-colors">
                          <Briefcase className="w-4 h-4 text-gray-400" /> Mes missions
                        </Link>
                        <Link to="/portefeuille" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-800 transition-colors">
                          <Wallet className="w-4 h-4 text-gray-400" /> Portefeuille
                        </Link>
                        {isAdmin && (
                          <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-primary-600 hover:bg-primary-50 transition-colors">
                            <Shield className="w-4 h-4" /> Administration
                          </Link>
                        )}
                        <hr className="my-1 border-gray-100" />
                        <button onClick={() => { setUserMenuOpen(false); logout(); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors">
                          <LogOut className="w-4 h-4" /> Se déconnecter
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/inscription?role=pro" className="text-sm font-semibold py-2 px-4 text-primary-700 hover:underline">Espace pro</Link>
                <Link to="/connexion" className="btn-secondary text-sm">Se connecter</Link>
                <Link to="/inscription" className="btn-accent text-sm">S'inscrire</Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white/95 backdrop-blur-xl px-4 py-3 space-y-1 animate-fade-in">
          {navLinks.map((l) => (
            <NavLink key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-lg text-sm font-medium ${isActive ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"}`}>
              {l.label}
            </NavLink>
          ))}
          {resourceLinks.map((r) => (
            <NavLink key={r.to} to={r.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-lg text-sm font-medium ${isActive ? "bg-primary-50 text-primary-700" : "text-gray-600 hover:bg-gray-50"}`}>
              {r.label}
            </NavLink>
          ))}
          <hr className="border-gray-100 my-2" />
          {user ? (
            <>
              <Link to="/tableau-de-bord" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Tableau de bord</Link>
              <Link to="/messages" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Messages</Link>
              <Link to="/missions" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Mes missions</Link>
              <Link to="/portefeuille" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Portefeuille</Link>
              <Link to="/profil/modifier" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Mon profil</Link>
              {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-primary-600 hover:bg-primary-50">Administration</Link>}
              <button onClick={() => { setMobileOpen(false); logout(); }} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">Se déconnecter</button>
            </>
          ) : (
            <>
              <Link to="/connexion" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Connexion</Link>
              <Link to="/inscription" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-full text-sm bg-accent-500 text-white text-center font-semibold">S'inscrire</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
