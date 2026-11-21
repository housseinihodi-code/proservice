import { Link } from "react-router-dom";
import { ShieldCheck, BadgeCheck, Lock, Star } from "lucide-react";

const POINTS = [
  { icon: BadgeCheck, title: "Profils vérifiés", text: "Diplômes et identité contrôlés par notre équipe." },
  { icon: Lock, title: "Paiement sécurisé", text: "Les fonds sont bloqués jusqu'à validation du travail." },
  { icon: Star, title: "Avis authentiques", text: "Seuls les clients d'une mission terminée peuvent noter." },
];

/** Mise en page commune connexion / inscription : panneau visuel + carte de formulaire. */
export default function AuthLayout({ title, subtitle, aside, children, footer }) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary-50/60 via-white to-white px-4 py-8 sm:py-14">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,theme(colors.primary.100),transparent_70%)] pointer-events-none" />
      <div className="relative mx-auto w-full max-w-5xl grid lg:grid-cols-[.9fr_1.1fr] rounded-[2rem] overflow-hidden bg-white shadow-lift ring-1 ring-gray-100">
        {/* Panneau visuel (grand écran) */}
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-hero-gradient text-white p-10 isolate">
          <img src="/images/pro.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity -z-10" />
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-accent-500/30 blur-3xl animate-blob -z-10" />
          <div className="absolute inset-0 bg-grid [mask-image:linear-gradient(to_bottom,black,transparent)] -z-10" />
          <div>
            <Link to="/" className="inline-flex items-center gap-2 mb-10">
              <span className="w-9 h-9 rounded-xl bg-accent-gradient flex items-center justify-center text-sm font-extrabold shadow-glow">PS</span>
              <span className="font-display font-extrabold text-xl">Pro<span className="text-accent-400">Services</span></span>
            </Link>
            {aside}
          </div>
          <ul className="space-y-4 mt-10">
            {POINTS.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex gap-3.5 glass rounded-2xl p-4">
                <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0"><Icon className="w-[1.1rem] h-[1.1rem]" /></span>
                <div>
                  <p className="font-semibold text-sm">{t}</p>
                  <p className="text-xs text-primary-100/90 mt-0.5">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* Formulaire */}
        <div className="p-6 sm:p-10 lg:p-12 flex flex-col justify-center">
          <div className="mb-7">
            <h1 className="text-2xl sm:text-3xl text-gray-900">{title}</h1>
            {subtitle && <p className="text-gray-500 mt-2">{subtitle}</p>}
          </div>
          {children}
          {footer && <div className="mt-7 pt-6 border-t border-gray-100 text-center text-sm text-gray-600">{footer}</div>}
          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Connexion chiffrée · Vos données ne sont jamais revendues
          </p>
        </div>
      </div>
    </div>
  );
}
