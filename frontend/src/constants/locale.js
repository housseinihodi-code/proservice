// Paramètres internationaux de la plateforme : pays, devise, commission.

export const CURRENCY = "EUR";
export const CURRENCY_SYMBOL = "€";

const moneyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 2,
});

/** Formate un montant : 1234.5 -> "1 234,50 €" */
export function formatMoney(amount) {
  return moneyFormatter.format(Number(amount) || 0);
}

// Doit rester aligné avec backend/app/config.py
export const COMMISSION_THRESHOLD_SMALL = 100;
export const COMMISSION_THRESHOLD_LARGE = 1000;

export function computeCommission(amount) {
  const a = Number(amount) || 0;
  const rate = a < COMMISSION_THRESHOLD_SMALL ? 0.15 : a <= COMMISSION_THRESHOLD_LARGE ? 0.1 : 0.08;
  return Math.round(a * rate * 100) / 100;
}

const OTHER_COUNTRIES = [
  ["AF", "Afghanistan"], ["ZA", "Afrique du Sud"], ["AL", "Albanie"], ["DZ", "Algérie"],
  ["DE", "Allemagne"], ["AD", "Andorre"], ["AO", "Angola"], ["AG", "Antigua-et-Barbuda"],
  ["SA", "Arabie saoudite"], ["AR", "Argentine"], ["AM", "Arménie"], ["AU", "Australie"],
  ["AT", "Autriche"], ["AZ", "Azerbaïdjan"], ["BS", "Bahamas"], ["BH", "Bahreïn"],
  ["BD", "Bangladesh"], ["BB", "Barbade"], ["BE", "Belgique"], ["BZ", "Belize"],
  ["BJ", "Bénin"], ["BT", "Bhoutan"], ["BY", "Biélorussie"], ["BO", "Bolivie"],
  ["BA", "Bosnie-Herzégovine"], ["BW", "Botswana"], ["BR", "Brésil"], ["BN", "Brunei"],
  ["BG", "Bulgarie"], ["BF", "Burkina Faso"], ["BI", "Burundi"], ["KH", "Cambodge"],
  ["CM", "Cameroun"], ["CA", "Canada"], ["CV", "Cap-Vert"], ["CL", "Chili"],
  ["CN", "Chine"], ["CY", "Chypre"], ["CO", "Colombie"], ["KM", "Comores"],
  ["CG", "Congo"], ["CD", "Congo (RDC)"], ["KR", "Corée du Sud"], ["KP", "Corée du Nord"],
  ["CR", "Costa Rica"], ["CI", "Côte d'Ivoire"], ["HR", "Croatie"], ["CU", "Cuba"],
  ["DK", "Danemark"], ["DJ", "Djibouti"], ["DM", "Dominique"], ["EG", "Égypte"],
  ["AE", "Émirats arabes unis"], ["EC", "Équateur"], ["ER", "Érythrée"], ["ES", "Espagne"],
  ["EE", "Estonie"], ["SZ", "Eswatini"], ["US", "États-Unis"], ["ET", "Éthiopie"],
  ["FJ", "Fidji"], ["FI", "Finlande"], ["GA", "Gabon"], ["GM", "Gambie"],
  ["GE", "Géorgie"], ["GH", "Ghana"], ["GR", "Grèce"], ["GD", "Grenade"],
  ["GT", "Guatemala"], ["GN", "Guinée"], ["GQ", "Guinée équatoriale"], ["GW", "Guinée-Bissau"],
  ["GY", "Guyana"], ["HT", "Haïti"], ["HN", "Honduras"], ["HU", "Hongrie"],
  ["IN", "Inde"], ["ID", "Indonésie"], ["IQ", "Irak"], ["IR", "Iran"],
  ["IE", "Irlande"], ["IS", "Islande"], ["IL", "Israël"], ["IT", "Italie"],
  ["JM", "Jamaïque"], ["JP", "Japon"], ["JO", "Jordanie"], ["KZ", "Kazakhstan"],
  ["KE", "Kenya"], ["KG", "Kirghizistan"], ["KI", "Kiribati"], ["XK", "Kosovo"],
  ["KW", "Koweït"], ["LA", "Laos"], ["LS", "Lesotho"], ["LV", "Lettonie"],
  ["LB", "Liban"], ["LR", "Liberia"], ["LY", "Libye"], ["LI", "Liechtenstein"],
  ["LT", "Lituanie"], ["LU", "Luxembourg"], ["MK", "Macédoine du Nord"], ["MG", "Madagascar"],
  ["MY", "Malaisie"], ["MW", "Malawi"], ["MV", "Maldives"], ["ML", "Mali"],
  ["MT", "Malte"], ["MA", "Maroc"], ["MH", "Marshall (Îles)"], ["MU", "Maurice"],
  ["MR", "Mauritanie"], ["MX", "Mexique"], ["FM", "Micronésie"], ["MD", "Moldavie"],
  ["MC", "Monaco"], ["MN", "Mongolie"], ["ME", "Monténégro"], ["MZ", "Mozambique"],
  ["MM", "Myanmar"], ["NA", "Namibie"], ["NR", "Nauru"], ["NP", "Népal"],
  ["NI", "Nicaragua"], ["NE", "Niger"], ["NG", "Nigeria"], ["NO", "Norvège"],
  ["NZ", "Nouvelle-Zélande"], ["OM", "Oman"], ["UG", "Ouganda"], ["UZ", "Ouzbékistan"],
  ["PK", "Pakistan"], ["PW", "Palaos"], ["PS", "Palestine"], ["PA", "Panama"],
  ["PG", "Papouasie-Nouvelle-Guinée"], ["PY", "Paraguay"], ["NL", "Pays-Bas"], ["PE", "Pérou"],
  ["PH", "Philippines"], ["PL", "Pologne"], ["PT", "Portugal"], ["QA", "Qatar"],
  ["CF", "République centrafricaine"], ["DO", "République dominicaine"], ["CZ", "République tchèque"], ["RO", "Roumanie"],
  ["GB", "Royaume-Uni"], ["RU", "Russie"], ["RW", "Rwanda"], ["KN", "Saint-Christophe-et-Niévès"],
  ["LC", "Sainte-Lucie"], ["SM", "Saint-Marin"], ["VC", "Saint-Vincent-et-les-Grenadines"], ["SB", "Salomon (Îles)"],
  ["SV", "Salvador"], ["WS", "Samoa"], ["ST", "Sao Tomé-et-Principe"], ["SN", "Sénégal"],
  ["RS", "Serbie"], ["SC", "Seychelles"], ["SL", "Sierra Leone"], ["SG", "Singapour"],
  ["SK", "Slovaquie"], ["SI", "Slovénie"], ["SO", "Somalie"], ["SD", "Soudan"],
  ["SS", "Soudan du Sud"], ["LK", "Sri Lanka"], ["SE", "Suède"], ["CH", "Suisse"],
  ["SR", "Suriname"], ["SY", "Syrie"], ["TJ", "Tadjikistan"], ["TZ", "Tanzanie"],
  ["TD", "Tchad"], ["TH", "Thaïlande"], ["TL", "Timor oriental"], ["TG", "Togo"],
  ["TO", "Tonga"], ["TT", "Trinité-et-Tobago"], ["TN", "Tunisie"], ["TM", "Turkménistan"],
  ["TR", "Turquie"], ["TV", "Tuvalu"], ["UA", "Ukraine"], ["UY", "Uruguay"],
  ["VU", "Vanuatu"], ["VA", "Vatican"], ["VE", "Venezuela"], ["VN", "Viêt Nam"],
  ["YE", "Yémen"], ["ZM", "Zambie"], ["ZW", "Zimbabwe"],
].sort((a, b) => a[1].localeCompare(b[1], "fr"));

/** Liste des pays : France en premier, puis ordre alphabétique. */
export const COUNTRIES = [["FR", "France"], ...OTHER_COUNTRIES].map(([code, name]) => ({ code, name }));

export const DEFAULT_COUNTRY = "FR";

const COUNTRY_NAMES = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]));

export function countryName(code) {
  return COUNTRY_NAMES[code] || code || "";
}

/** "Lyon, France" à partir d'un utilisateur ou d'une offre. */
export function formatLocation(city, country) {
  return [city, countryName(country)].filter(Boolean).join(", ");
}

export const PHONE_PLACEHOLDER = "+33 6 12 34 56 78";

// Villes mises en avant sur la page d'accueil (France d'abord)
export const FEATURED_CITIES = [
  { city: "Paris", country: "FR" },
  { city: "Lyon", country: "FR" },
  { city: "Marseille", country: "FR" },
  { city: "Toulouse", country: "FR" },
  { city: "Bordeaux", country: "FR" },
  { city: "Lille", country: "FR" },
  { city: "Nantes", country: "FR" },
  { city: "Bruxelles", country: "BE" },
  { city: "Genève", country: "CH" },
  { city: "Montréal", country: "CA" },
  { city: "Casablanca", country: "MA" },
  { city: "Dakar", country: "SN" },
  { city: "Abidjan", country: "CI" },
  { city: "Douala", country: "CM" },
];

export const DOMAIN_IMAGES = {
  "Informatique & Tech": "/images/domain-info.jpg",
  "Conseil & Gestion": "/images/domain-conseil.jpg",
  "Ingénierie & BTP": "/images/domain-btp.jpg",
  "Santé & Paramédical": "/images/domain-sante.jpg",
  "Éducation & Formation": "/images/domain-education.jpg",
  "Création & Design": "/images/domain-design.jpg",
  "Services à la personne": "/images/domain-services.jpg",
  "Droit & Juridique": "/images/domain-droit.jpg",
};

/** Regroupe une liste de métiers [{name, domain}] par domaine, dans l'ordre de DOMAINS. */
export function groupTradesByDomain(trades = []) {
  const groups = {};
  for (const t of trades) (groups[t.domain] ||= []).push(t);
  const order = [...DOMAINS, ...Object.keys(groups).filter((d) => !DOMAINS.includes(d))];
  return order.filter((d) => groups[d]).map((d) => ({
    domain: d,
    trades: groups[d].sort((a, b) => a.name.localeCompare(b.name, "fr", { sensitivity: "base" })),
  }));
}

/** Message d'erreur lisible depuis une réponse FastAPI (texte ou liste de validation). */
export function apiError(err, fallback = "Une erreur est survenue") {
  const d = err?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg.replace(/^Value error, /, "");
  return fallback;
}

export const DOMAINS = [
  "Informatique & Tech", "Conseil & Gestion", "Ingénierie & BTP", "Santé & Paramédical",
  "Éducation & Formation", "Création & Design", "Services à la personne", "Droit & Juridique",
];

export const CONTACT_SUBJECTS = {
  QUESTION: "Question générale",
  ACCOUNT: "Mon compte",
  PAYMENT: "Paiement",
  DISPUTE: "Litige sur une mission",
  PARTNERSHIP: "Partenariat",
  OTHER: "Autre",
};
