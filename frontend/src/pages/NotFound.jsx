import { Link } from "react-router-dom";
import { Search, Home } from "lucide-react";

export default function NotFound() {
  return (
    <section className="max-w-xl mx-auto px-4 py-24 text-center">
      <p className="text-7xl font-extrabold text-primary-900 mb-4">404</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Cette page n'existe pas</h1>
      <p className="text-gray-500 mb-8">Le lien est peut-être erroné, ou la page a été déplacée.</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to="/" className="btn-primary flex items-center justify-center gap-2"><Home className="w-4 h-4" /> Retour à l'accueil</Link>
        <Link to="/recherche" className="btn-secondary flex items-center justify-center gap-2"><Search className="w-4 h-4" /> Trouver un professionnel</Link>
      </div>
    </section>
  );
}
