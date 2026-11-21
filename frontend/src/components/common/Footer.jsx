import { Link } from "react-router-dom";
import { DEFAULT_COUNTRY } from "../../constants/locale";

const COLUMNS = [
  {
    title: "Trouver un pro",
    links: [
      { to: "/recherche", label: "Tous les professionnels" },
      { to: "/metiers", label: "Tous les métiers" },
      { to: `/recherche?city=Paris&country=${DEFAULT_COUNTRY}`, label: "Professionnels à Paris" },
      { to: `/recherche?city=Lyon&country=${DEFAULT_COUNTRY}`, label: "Professionnels à Lyon" },
      { to: "/recherche?domain=Informatique%20%26%20Tech", label: "Informatique & Tech" },
      { to: "/recherche?domain=Services%20%C3%A0%20la%20personne", label: "Services à la personne" },
    ],
  },
  {
    title: "Pour les professionnels",
    links: [
      { to: "/inscription?role=pro", label: "Créer mon profil" },
      { to: "/offres", label: "Missions disponibles" },
      { to: "/profil/modifier", label: "Faire vérifier mon profil" },
      { to: "/portefeuille", label: "Mon portefeuille" },
    ],
  },
  {
    title: "ProServices",
    links: [
      { to: "/a-propos", label: "À propos" },
      { to: "/comment-ca-marche", label: "Comment ça marche" },
      { to: "/faq", label: "Centre d'aide" },
      { to: "/contact", label: "Nous contacter" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-primary-950 text-primary-100 mt-auto isolate">
      <div className="absolute inset-0 bg-grid [mask-image:linear-gradient(to_bottom,black,transparent_70%)] -z-10" />
      <div className="absolute -top-40 right-0 w-[32rem] h-[32rem] rounded-full bg-primary-600/20 blur-3xl -z-10" />
      <div className="h-px bg-gradient-to-r from-transparent via-accent-500/60 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 py-14">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link to="/" className="group inline-flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-accent-gradient rounded-xl flex items-center justify-center text-white text-sm font-extrabold shadow-glow transition-transform duration-500 group-hover:rotate-[8deg] group-hover:scale-105">PS</div>
              <span className="font-display font-extrabold text-white text-xl">Pro<span className="text-accent-400">Services</span></span>
            </Link>
            <p className="text-sm text-primary-200 leading-relaxed max-w-sm">
              La plateforme qui met en relation clients et professionnels qualifiés, en France et partout dans le monde.
            </p>
            <p className="text-sm text-primary-200 mt-4">Disponible dans plus de 190 pays</p>
            <p className="text-sm text-primary-200 mt-1">contact@proservices.fr</p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="font-display font-bold text-white mb-4">{col.title}</h4>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}><Link to={l.to} className="inline-block text-primary-200 hover:text-white hover:translate-x-1 transition-all duration-300">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-primary-300">
          <p>© {new Date().getFullYear()} ProServices. Tous droits réservés.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
            <Link to="/cgu" className="hover:text-white transition-colors">Conditions d'utilisation</Link>
            <Link to="/confidentialite" className="hover:text-white transition-colors">Confidentialité et cookies</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Aide et contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
