import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, ArrowRight, ChevronDown, ChevronUp, ShieldCheck, BadgeCheck, Star, Lock, Sparkles, Globe2, Briefcase, Users } from "lucide-react";
import { professionalsAPI, offersAPI, tradesAPI } from "../services/api";
import ProfileCard, { ProfileCardSkeleton } from "../components/professional/ProfileCard";
import { Reveal, CountUp, Marquee } from "../components/common/Motion";
import {
  COUNTRIES, DEFAULT_COUNTRY, FEATURED_CITIES, countryName, formatLocation, formatMoney,
} from "../constants/locale";

const IMG = "/images";

// Métiers mis en avant sur l'accueil (doivent exister dans le catalogue).
const POPULAR_TRADES = [
  "Plombier", "Électricien", "Développeur web", "Professeur particulier", "Agent d'entretien",
  "Graphiste", "Expert-comptable", "Menuisier", "Garde d'enfants", "Photographe",
  "Peintre en bâtiment", "Infirmier", "Jardinier", "Avocat", "Designer UX/UI", "Déménageur",
];

const QUICK_SEARCHES = ["Plombier", "Développeur web", "Électricien", "Cours particuliers", "Ménage", "Graphiste", "Comptable"];

const DOMAINS = [
  { name: "Informatique & Tech", img: `${IMG}/domain-info.jpg` },
  { name: "Conseil & Gestion", img: `${IMG}/domain-conseil.jpg` },
  { name: "Ingénierie & BTP", img: `${IMG}/domain-btp.jpg` },
  { name: "Santé & Paramédical", img: `${IMG}/domain-sante.jpg` },
  { name: "Éducation & Formation", img: `${IMG}/domain-education.jpg` },
  { name: "Création & Design", img: `${IMG}/domain-design.jpg` },
  { name: "Services à la personne", img: `${IMG}/domain-services.jpg` },
  { name: "Droit & Juridique", img: `${IMG}/domain-droit.jpg` },
];
const DOMAIN_IMG = Object.fromEntries(DOMAINS.map((d) => [d.name, d.img]));

const STEPS = [
  {
    img: `${IMG}/step-besoin.jpg`,
    title: "Décrivez votre besoin",
    desc: "Publiez une mission en quelques minutes : description, budget, lieu ou à distance.",
    cta: "Publier une mission", to: "/offres",
  },
  {
    img: `${IMG}/step-comparer.jpg`,
    title: "Comparez les profils",
    desc: "Consultez les avis, les tarifs et les documents vérifiés, puis échangez par messagerie.",
    cta: "Voir les professionnels", to: "/recherche",
  },
  {
    img: `${IMG}/step-payer.jpg`,
    title: "Payez en toute sécurité",
    desc: "Le paiement reste bloqué jusqu'à ce que vous validiez le travail réalisé.",
    cta: "Comment ça marche", to: "/comment-ca-marche",
  },
];

const TOOLS = [
  { img: `${IMG}/tool-commission.jpg`, title: "Simulateur de commission", desc: "Calculez ce que le professionnel recevra.", to: "/missions/creer", cta: "Simuler" },
  { img: `${IMG}/tool-wallet.jpg`, title: "Portefeuille ProServices", desc: "Rechargez et transférez des fonds en un clic.", to: "/portefeuille", cta: "Ouvrir" },
  { img: `${IMG}/tool-verif.jpg`, title: "Faire vérifier son profil", desc: "Ajoutez vos diplômes pour obtenir le badge vérifié.", to: "/profil/modifier", cta: "Commencer" },
  { img: `${IMG}/tool-aide.jpg`, title: "Centre d'aide", desc: "Toutes les réponses à vos questions.", to: "/faq", cta: "Consulter" },
];

// Photos Wikimedia sous licence CC BY / CC BY-SA : l'attribution est obligatoire.
const BIG_CITIES = [
  { city: "Paris", country: "FR", img: `${IMG}/city-paris.jpg` },
  {
    city: "Lyon", country: "FR", img: `${IMG}/city-lyon.jpg`,
    credit: { text: "Photo : Calips, CC BY-SA 1.0", href: "https://commons.wikimedia.org/wiki/File:Lyon_vue_depuis_fourviere.jpg" },
  },
  {
    city: "Marseille", country: "FR", img: `${IMG}/city-marseille.jpg`,
    credit: { text: "Photo : Guilhem Vellut, CC BY 2.0", href: "https://commons.wikimedia.org/wiki/File:Vieux_Port_@_Marseille_(8259089299).jpg" },
  },
];

const FEATURED_COUNTRIES = ["FR", "BE", "CH", "LU", "CA", "MA", "SN", "CI", "CM", "TN", "DZ", "US"];

const TRUST = [
  { title: "Profils vérifiés", desc: "Diplômes et pièces d'identité contrôlés par notre équipe avant l'obtention du badge." },
  { title: "Paiement sécurisé", desc: "Les fonds sont bloqués jusqu'à la validation du travail par le client." },
  { title: "Avis authentiques", desc: "Seules les personnes ayant terminé une mission ensemble peuvent se noter." },
];

function Photo({ src, alt = "", className = "", eager = false }) {
  return <img src={src} alt={alt} loading={eager ? "eager" : "lazy"} className={`object-cover ${className}`} />;
}

function SearchBar() {
  const navigate = useNavigate();
  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (what.trim()) params.set("search", what.trim());
    if (where.trim()) params.set("city", where.trim());
    if (country) params.set("country", country);
    navigate(`/recherche?${params.toString()}`);
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl md:rounded-full shadow-[0_30px_80px_-20px_rgba(0,0,0,.45)] ring-1 ring-white/20 p-2 flex flex-col md:flex-row md:items-center gap-1 text-gray-900 transition-shadow duration-300 focus-within:ring-4 focus-within:ring-accent-400/40">
      <label className="flex items-center gap-3 flex-1 px-4 py-2.5 md:border-r border-gray-200">
        <Search className="w-5 h-5 text-primary-600 flex-shrink-0" />
        <span className="flex-1">
          <span className="block text-xs font-bold text-gray-900">Quoi ?</span>
          <input
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            placeholder="Métier, compétence, nom..."
            className="w-full text-sm outline-none placeholder:text-gray-400 bg-transparent"
          />
        </span>
      </label>
      <label className="flex items-center gap-3 flex-1 px-4 py-2.5 md:border-r border-gray-200 border-t md:border-t-0">
        <MapPin className="w-5 h-5 text-primary-600 flex-shrink-0" />
        <span className="flex-1">
          <span className="block text-xs font-bold text-gray-900">Où ?</span>
          <input
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            placeholder="Ville"
            className="w-full text-sm outline-none placeholder:text-gray-400 bg-transparent"
          />
        </span>
      </label>
      <label className="flex items-center gap-3 md:w-56 px-4 py-2.5 border-t md:border-t-0 border-gray-200">
        {country ? (
          <img src={`${IMG}/flags/${country.toLowerCase()}.svg`} alt="" className="w-6 h-4 rounded-sm object-cover flex-shrink-0 border border-gray-200" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : null}
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-bold text-gray-900">Pays</span>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full text-sm outline-none bg-transparent truncate">
            <option value="">Tous les pays</option>
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </span>
      </label>
      <button type="submit" className="btn-accent px-8 py-3.5 rounded-xl md:rounded-full font-bold">
        <Search className="w-4 h-4" /> Rechercher
      </button>
    </form>
  );
}

function SectionHeader({ eyebrow, title, subtitle, link, linkLabel }) {
  return (
    <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-10">
      <div>
        {eyebrow && <p className="eyebrow mb-3"><span className="w-6 h-px bg-accent-500" />{eyebrow}</p>}
        <h2 className="text-3xl md:text-4xl text-gray-900">{title}</h2>
        {subtitle && <p className="text-gray-500 mt-3 text-lg">{subtitle}</p>}
      </div>
      {link && (
        <Link to={link} className="group text-primary-700 font-semibold text-sm flex items-center gap-1.5 flex-shrink-0">
          {linkLabel} <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      )}
    </Reveal>
  );
}

function FloatCard({ className = "", children }) {
  return (
    <div className={`absolute bg-white/95 backdrop-blur-xl text-gray-900 rounded-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,.5)] ring-1 ring-black/5 p-4 ${className}`}>
      {children}
    </div>
  );
}

export default function Home() {
  const [showAllDomains, setShowAllDomains] = useState(false);

  const { data: topPros, isLoading: prosLoading } = useQuery({
    queryKey: ["home-top-professionals"],
    queryFn: () => professionalsAPI.list({ page: 1, size: 4 }).then((r) => r.data),
  });

  const { data: recentOffers, isLoading: offersLoading } = useQuery({
    queryKey: ["home-recent-offers"],
    queryFn: () => offersAPI.list({ page: 1, size: 5 }).then((r) => r.data),
  });

  const { data: trades } = useQuery({
    queryKey: ["trades"],
    queryFn: () => tradesAPI.list().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const tradeByName = Object.fromEntries((trades || []).map((t) => [t.name, t]));
  const popularTrades = POPULAR_TRADES.filter((n) => tradeByName[n]).map((n) => tradeByName[n]);

  const prosCount = topPros?.total ?? 0;
  const offersCount = recentOffers?.total ?? 0;
  const visibleDomains = showAllDomains ? DOMAINS : DOMAINS.slice(0, 4);
  const otherCities = FEATURED_CITIES.filter((c) => !BIG_CITIES.some((b) => b.city === c.city));

  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-hero-gradient text-white px-4 pt-16 pb-24 md:pt-24 md:pb-32">
        <Photo eager src={`${IMG}/hero.jpg`} className="absolute inset-0 w-full h-full opacity-[.18] mix-blend-luminosity -z-10" />
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)] -z-10" />
        <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-primary-500/40 blur-3xl animate-blob -z-10" />
        <div className="absolute top-20 -right-32 w-[30rem] h-[30rem] rounded-full bg-accent-500/25 blur-3xl animate-blob [animation-delay:-6s] -z-10" />
        <div className="absolute -bottom-40 left-1/3 w-[26rem] h-[26rem] rounded-full bg-indigo-500/25 blur-3xl animate-blob [animation-delay:-12s] -z-10" />

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1.15fr_.85fr] gap-12 items-center">
          <div>
            <p className="animate-fade-up inline-flex items-center gap-2.5 text-sm font-medium glass rounded-full px-4 py-1.5 mb-7">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-pulse-ring" />
                <span className="relative w-2 h-2 rounded-full bg-emerald-400" />
              </span>
              Des professionnels vérifiés, partout dans le monde
            </p>
            <h1 className="animate-fade-up [animation-delay:.08s] text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] max-w-3xl">
              Trouvez le bon professionnel,{" "}
              <span className="text-gradient animate-gradient-x">près de chez vous.</span>
            </h1>
            <p className="animate-fade-up [animation-delay:.16s] text-primary-100/90 text-lg md:text-xl mt-6 mb-9 max-w-2xl">
              Artisans, experts, formateurs : comparez les profils, échangez en direct et payez en toute sécurité.
            </p>

            <div className="animate-fade-up [animation-delay:.24s]"><SearchBar /></div>

            <div className="animate-fade-up [animation-delay:.32s] flex flex-wrap items-center gap-2 mt-6">
              <span className="text-sm text-primary-200 mr-1">Populaire :</span>
              {QUICK_SEARCHES.map((q) => (
                <Link
                  key={q}
                  to={`/recherche?search=${encodeURIComponent(q)}&country=${DEFAULT_COUNTRY}`}
                  className="text-sm glass hover:bg-white/20 hover:-translate-y-0.5 rounded-full px-3.5 py-1 transition-all duration-300"
                >
                  {q}
                </Link>
              ))}
            </div>
          </div>

          {/* Visuel : photo et cartes flottantes */}
          <div className="relative hidden lg:block h-[30rem] animate-fade-in [animation-delay:.3s]">
            <div className="absolute inset-6 rounded-[2rem] overflow-hidden ring-1 ring-white/15 shadow-[0_40px_100px_-30px_rgba(0,0,0,.7)] rotate-2">
              <Photo eager src={`${IMG}/pro.jpg`} alt="Artisan au travail" className="w-full h-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-950/70 via-transparent to-transparent" />
            </div>
            <FloatCard className="-left-6 top-10 w-60 animate-float">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><ShieldCheck className="w-5 h-5" /></span>
                <div>
                  <p className="text-sm font-bold">Paiement sécurisé</p>
                  <p className="text-xs text-gray-500">Fonds bloqués jusqu'à validation</p>
                </div>
              </div>
            </FloatCard>
            <FloatCard className="-right-4 top-1/2 w-56 animate-float-slow [animation-delay:-3s]">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><BadgeCheck className="w-5 h-5" /></span>
                <div>
                  <p className="text-sm font-bold">Profils vérifiés</p>
                  <p className="text-xs text-gray-500">Diplômes et identité contrôlés</p>
                </div>
              </div>
            </FloatCard>
            <FloatCard className="left-10 bottom-2 w-64 animate-float [animation-delay:-1.5s]">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Disponibles maintenant</p>
              <p className="text-3xl font-display font-extrabold text-primary-900 mt-1"><CountUp value={prosCount} /> <span className="text-base font-semibold text-gray-500">pros</span></p>
              <p className="text-xs text-gray-500 mt-0.5"><CountUp value={offersCount} /> missions ouvertes</p>
            </FloatCard>
          </div>
        </div>
      </section>

      {/* Bandeau de confiance */}
      <section className="relative -mt-12 px-4 z-10">
        <Reveal className="max-w-6xl mx-auto bg-white rounded-3xl shadow-lift border border-gray-100 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {[
            { icon: Users, value: prosCount, label: "professionnels inscrits" },
            { icon: Briefcase, value: offersCount, label: "missions ouvertes" },
            { icon: Sparkles, value: trades?.length || 0, label: "métiers référencés" },
            { icon: Globe2, value: COUNTRIES.length, label: "pays couverts" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-4 p-5 md:p-6">
              <span className="w-11 h-11 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5" /></span>
              <div>
                <p className="text-2xl md:text-3xl font-display font-extrabold text-primary-900 leading-none"><CountUp value={value} /></p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Métiers qui défilent */}
      {trades?.length > 0 && (
        <section className="pt-14 pb-4">
          <Marquee>
            {trades.slice(0, 30).map((t) => (
              <Link key={t.id} to={`/recherche?trade=${encodeURIComponent(t.name)}`} className="flex items-center gap-2 whitespace-nowrap rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-primary-300 hover:text-primary-700 transition-colors">
                <img src={DOMAIN_IMG[t.domain]} alt="" className="w-6 h-6 rounded-full object-cover" loading="lazy" />
                {t.name}
              </Link>
            ))}
          </Marquee>
        </section>
      )}

      {/* Meilleurs professionnels */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionHeader
            eyebrow="Talents"
            title="Les professionnels les mieux notés"
            subtitle="Des experts vérifiés, évalués par leurs clients"
            link="/recherche"
            linkLabel="Voir tous les professionnels"
          />
          {prosLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{[0, 1, 2, 3].map((i) => <ProfileCardSkeleton key={i} />)}</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {topPros?.items?.map((p, i) => <Reveal key={p.id} delay={i * 90}><ProfileCard professional={p} /></Reveal>)}
              {topPros?.items?.length === 0 && <p className="text-gray-400 col-span-4 text-center py-8">Aucun professionnel pour l'instant</p>}
            </div>
          )}
        </div>
      </section>

      {/* Simple comme ProServices */}
      <section className="relative py-20 px-4 bg-gradient-to-b from-primary-50/70 to-white overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-12">
            <p className="eyebrow mb-3">Comment ça marche</p>
            <h2 className="text-3xl md:text-4xl text-gray-900">Simple comme ProServices</h2>
            <p className="text-gray-500 text-lg mt-3">Trois étapes pour faire réaliser votre projet</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={i * 120} className="group bg-white rounded-3xl overflow-hidden flex flex-col shadow-soft lift border border-gray-100">
                <div className="relative overflow-hidden">
                  <Photo src={s.img} alt={s.title} className="w-full h-48 transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-950/40 to-transparent" />
                  <span className="absolute top-4 left-4 bg-accent-gradient text-white font-display font-extrabold text-sm rounded-2xl w-10 h-10 flex items-center justify-center shadow-glow">
                    {i + 1}
                  </span>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                  <p className="text-gray-600 text-sm flex-1">{s.desc}</p>
                  <Link to={s.to} className="btn-secondary text-sm mt-6 self-start">{s.cta} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Chiffres clés */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
          <Reveal variant="left" className="relative overflow-hidden rounded-3xl bg-hero-gradient text-white p-8 md:p-10">
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-accent-500/25 blur-3xl animate-blob" />
            <p className="relative text-5xl md:text-6xl font-display font-extrabold"><CountUp value={prosCount} /></p>
            <p className="relative text-primary-200 mt-2 mb-6">professionnels prêts à vous aider</p>
            <Link to="/offres" className="relative btn-accent px-6 py-3">
              Publier une mission <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
          <Reveal variant="right" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent-50 to-white border border-accent-100 p-8 md:p-10">
            <p className="text-5xl md:text-6xl font-display font-extrabold text-gray-900"><CountUp value={offersCount} /></p>
            <p className="text-gray-600 mt-2 mb-6">missions ouvertes aux professionnels</p>
            <Link to="/offres" className="btn-primary px-6 py-3">
              Voir les missions <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Missions récentes */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <SectionHeader eyebrow="Opportunités" title="Missions récentes" subtitle="Postulez dès maintenant" link="/offres" linkLabel="Voir toutes les missions" />
          {offersLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
          ) : (
            <div className="space-y-3">
              {recentOffers?.items?.map((o, i) => (
                <Reveal key={o.id} delay={i * 70}>
                <Link to="/offres" className="group bg-white rounded-2xl border border-gray-200 hover:border-primary-200 lift p-4 flex flex-col md:flex-row md:items-center gap-4">
                  <Photo src={DOMAIN_IMG[o.domain] || `${IMG}/step-besoin.jpg`} alt={o.domain} className="w-full md:w-20 h-32 md:h-16 rounded-xl flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{o.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                      <span className="badge badge-blue">{o.domain}</span>
                      <span>{formatLocation(o.location_city, o.location_country) || "À distance"}</span>
                      <span>Publiée le {new Date(o.created_at).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>
                  <div className="font-bold text-primary-700 md:text-right">
                    {o.budget_min || o.budget_max
                      ? [o.budget_min, o.budget_max].filter(Boolean).map(formatMoney).join(" – ")
                      : "Budget à définir"}
                  </div>
                  <ArrowRight className="hidden md:block w-5 h-5 text-gray-300 transition-all duration-300 group-hover:text-primary-600 group-hover:translate-x-1" />
                </Link>
                </Reveal>
              ))}
              {recentOffers?.items?.length === 0 && <p className="text-gray-400 text-center py-8">Aucune mission pour l'instant</p>}
            </div>
          )}
        </div>
      </section>

      {/* Domaines */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionHeader eyebrow="Secteurs" title="Explorer par domaine" subtitle="Des experts dans tous les secteurs d'activité" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {visibleDomains.map((d, i) => (
              <Reveal key={d.name} delay={(i % 4) * 80} variant="zoom">
              <Link to={`/recherche?domain=${encodeURIComponent(d.name)}`} className="group relative block h-52 rounded-3xl overflow-hidden shadow-soft hover:shadow-lift transition-shadow duration-500">
                <Photo src={d.img} alt={d.name} className="absolute inset-0 w-full h-full transition-transform duration-700 ease-out group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-950/85 via-primary-950/20 to-transparent transition-opacity duration-500 group-hover:from-primary-900/90" />
                <span className="absolute bottom-4 left-5 right-5 font-display font-bold text-white text-lg leading-snug flex items-end justify-between gap-2">
                  {d.name}
                  <span className="w-8 h-8 rounded-full bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"><ArrowRight className="w-4 h-4" /></span>
                </span>
              </Link>
              </Reveal>
            ))}
          </div>
          <div className="text-center mt-6">
            <button onClick={() => setShowAllDomains((v) => !v)} className="btn-secondary inline-flex items-center gap-1 text-sm">
              {showAllDomains ? <>Voir moins <ChevronUp className="w-4 h-4" /></> : <>Voir plus <ChevronDown className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      </section>

      {/* Métiers */}
      {popularTrades.length > 0 && (
        <section className="relative overflow-hidden py-20 px-4 bg-hero-gradient text-white">
          <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
          <div className="absolute -left-20 bottom-0 w-96 h-96 rounded-full bg-accent-500/20 blur-3xl animate-blob" />
          <div className="relative max-w-6xl mx-auto">
            <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
              <div>
                <p className="eyebrow mb-3 text-accent-400"><span className="w-6 h-px bg-accent-400" />Métiers</p>
                <h2 className="text-3xl md:text-4xl font-extrabold">Les métiers les plus recherchés</h2>
                <p className="text-primary-200 mt-2">{trades?.length} métiers disponibles, de l'artisan au consultant.</p>
              </div>
              <Link to="/metiers" className="group inline-flex items-center gap-1.5 font-semibold text-accent-400 hover:text-accent-300">
                Voir tous les métiers <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Reveal>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {popularTrades.map((t, i) => (
                <Reveal key={t.id} delay={(i % 4) * 60}>
                <Link to={`/recherche?trade=${encodeURIComponent(t.name)}`} className="group flex items-center gap-3 rounded-2xl glass hover:bg-white/15 hover:-translate-y-1 hover:border-white/30 p-3 transition-all duration-300">
                  <img src={DOMAIN_IMG[t.domain]} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate group-hover:text-accent-400">{t.name}</p>
                    <p className="text-xs text-primary-300 truncate">{t.professionals_count > 0 ? `${t.professionals_count} pro${t.professionals_count > 1 ? "s" : ""}` : t.domain}</p>
                  </div>
                </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Outils */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <SectionHeader eyebrow="Services" title="Nos outils" subtitle="Pour gérer vos missions sereinement" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TOOLS.map((t, i) => (
              <Reveal key={t.title} delay={i * 90}>
              <Link to={t.to} className="group h-full bg-white rounded-3xl border border-gray-100 shadow-soft overflow-hidden flex flex-col lift">
                <div className="overflow-hidden"><Photo src={t.img} alt={t.title} className="w-full h-40 transition-transform duration-700 group-hover:scale-110" /></div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">{t.title}</h3>
                  <p className="text-sm text-gray-600 flex-1">{t.desc}</p>
                  <span className="text-primary-700 font-semibold text-sm mt-4 inline-flex items-center gap-1.5">
                    {t.cta} <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Villes */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionHeader eyebrow="Proximité" title="Trouvez un pro dans votre ville" subtitle="En France et partout dans le monde" />
          <div className="grid md:grid-cols-3 gap-5 mb-6">
            {BIG_CITIES.map((c, i) => (
              <Reveal key={c.city} delay={i * 110} variant="zoom" className="relative h-64 rounded-3xl overflow-hidden group shadow-soft hover:shadow-lift transition-shadow duration-500">
                <Link to={`/recherche?city=${encodeURIComponent(c.city)}&country=${c.country}`} className="absolute inset-0">
                  <Photo src={c.img} alt={c.city} className="absolute inset-0 w-full h-full transition-transform duration-700 ease-out group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-5 left-6 text-white">
                    <span className="block text-sm text-white/80">{countryName(c.country)}</span>
                    <span className="text-2xl font-extrabold flex items-center gap-2">
                      {c.city} <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
                {c.credit && (
                  <a href={c.credit.href} target="_blank" rel="noreferrer" className="absolute top-2 right-3 text-[10px] text-white/80 hover:text-white bg-black/30 rounded px-1.5 py-0.5">
                    {c.credit.text}
                  </a>
                )}
              </Reveal>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {otherCities.map((c) => (
              <Link
                key={c.city}
                to={`/recherche?city=${encodeURIComponent(c.city)}&country=${c.country}`}
                className="text-sm bg-white border border-gray-200 shadow-sm hover:border-primary-300 hover:text-primary-700 hover:-translate-y-0.5 rounded-full px-4 py-1.5 transition-all duration-300"
              >
                {c.city} <span className="text-gray-400">· {countryName(c.country)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pays avec drapeaux */}
      <section className="py-16 px-4 bg-primary-50">
        <div className="max-w-6xl mx-auto">
          <SectionHeader eyebrow="International" title="Une plateforme internationale" subtitle="Choisissez votre pays pour voir les professionnels disponibles" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {FEATURED_COUNTRIES.map((code, i) => (
              <Reveal key={code} delay={(i % 6) * 50}>
              <Link
                to={`/recherche?country=${code}`}
                className={`rounded-2xl px-3 py-3 text-sm font-semibold flex items-center gap-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift ${code === "FR" ? "bg-primary-gradient text-white shadow-glow-primary" : "bg-white text-gray-800 shadow-soft"}`}
              >
                <img src={`${IMG}/flags/${code.toLowerCase()}.svg`} alt="" className="w-7 h-5 rounded-sm object-cover border border-black/10 flex-shrink-0" />
                {countryName(code)}
              </Link>
              </Reveal>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Et {COUNTRIES.length - FEATURED_COUNTRIES.length} autres pays : choisissez le vôtre dans la recherche.
          </p>
        </div>
      </section>

      {/* Confiance */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <Reveal variant="left" className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary-100 to-accent-100 rounded-[2.5rem] -rotate-2" />
            <Photo src={`${IMG}/trust.jpg`} alt="Poignée de main entre un client et un professionnel" className="relative w-full h-72 md:h-96 rounded-3xl shadow-lift" />
            <div className="absolute -bottom-6 -right-4 md:right-6 bg-white rounded-2xl shadow-lift p-4 flex items-center gap-3 animate-float">
              <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center"><Star className="w-5 h-5 fill-amber-400" /></span>
              <div><p className="text-sm font-bold">Avis authentiques</p><p className="text-xs text-gray-500">Après une mission terminée</p></div>
            </div>
          </Reveal>
          <div>
            <Reveal><p className="eyebrow mb-3"><span className="w-6 h-px bg-accent-500" />Confiance</p>
            <h2 className="text-3xl md:text-4xl text-gray-900 mb-8">Une relation de confiance</h2></Reveal>
            <div className="space-y-6">
              {TRUST.map((item, i) => {
                const Icon = [BadgeCheck, Lock, Star][i];
                return (
                <Reveal key={item.title} delay={i * 120} variant="right" className="flex gap-4 p-4 -mx-4 rounded-2xl hover:bg-primary-50/60 transition-colors">
                  <span className="w-11 h-11 rounded-2xl bg-primary-gradient text-white flex items-center justify-center flex-shrink-0 shadow-glow-primary"><Icon className="w-5 h-5" /></span>
                  <div>
                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                  </div>
                </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Appel à l'action professionnels */}
      <section className="px-4 pb-20 pt-4">
        <Reveal variant="zoom" className="relative max-w-6xl mx-auto rounded-[2rem] bg-hero-gradient text-white overflow-hidden grid md:grid-cols-2 items-center isolate">
          <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_left,black_20%,transparent_70%)] -z-10" />
          <div className="absolute -top-24 left-1/3 w-80 h-80 rounded-full bg-accent-500/30 blur-3xl animate-blob -z-10" />
          <div className="p-8 md:p-14">
            <p className="eyebrow text-accent-400 mb-4"><span className="w-6 h-px bg-accent-400" />Espace professionnel</p>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Développez votre activité avec ProServices</h2>
            <p className="text-primary-100 text-lg mb-8">Créez votre profil gratuitement, faites-le vérifier et recevez des missions de clients près de chez vous.</p>
            <div className="flex flex-wrap gap-3">
              <Link to="/inscription?role=pro" className="btn-accent px-7 py-3.5 text-base">Créer mon profil <ArrowRight className="w-4 h-4" /></Link>
              <Link to="/comment-ca-marche" className="btn-base px-7 py-3.5 text-base glass hover:bg-white/20 text-white">Comment ça marche</Link>
            </div>
          </div>
          <div className="relative h-64 md:h-full min-h-[20rem] overflow-hidden">
            <Photo src={`${IMG}/pro.jpg`} alt="Professionnel au travail" className="absolute inset-0 w-full h-full transition-transform duration-[2s] hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary-900 via-primary-900/30 to-transparent" />
          </div>
        </Reveal>
      </section>
    </div>
  );
}
