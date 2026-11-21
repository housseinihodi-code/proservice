import { NavLink } from "react-router-dom";

// Textes juridiques de base. Les mentions entre crochets doivent être complétées
// avec les informations réelles de l'éditeur avant toute mise en ligne.
const PAGES = {
  "mentions-legales": {
    title: "Mentions légales",
    sections: [
      ["Éditeur du site", "ProServices — [forme juridique, capital, adresse du siège, numéro RCS/SIREN à compléter]. Directeur de la publication : [nom à compléter]. Contact : contact@proservices.fr."],
      ["Hébergement", "[Nom, adresse et téléphone de l'hébergeur à compléter.]"],
      ["Propriété intellectuelle", "Les contenus du site (textes, logo, mise en page) appartiennent à ProServices. Les photos d'illustration proviennent de banques d'images libres de droits. Les contenus publiés par les utilisateurs (profils, offres, avis) restent sous leur responsabilité."],
    ],
  },
  cgu: {
    title: "Conditions générales d'utilisation",
    sections: [
      ["Objet", "ProServices met en relation des clients (particuliers ou entreprises) avec des professionnels indépendants. ProServices n'est pas partie au contrat de prestation conclu entre le client et le professionnel."],
      ["Inscription", "L'inscription est gratuite. Chaque utilisateur s'engage à fournir des informations exactes et à garder son mot de passe confidentiel. Un compte peut être suspendu en cas de fraude, de contenu illicite ou de non-respect des présentes conditions."],
      ["Déroulement d'une mission", "Le client propose une mission ou publie une offre ; le professionnel l'accepte. Le client règle le montant convenu, qui est conservé par ProServices (séquestre) jusqu'à la livraison. Après validation par le client, le professionnel reçoit le montant net sur son portefeuille. En cas de désaccord, l'un ou l'autre peut ouvrir un litige, tranché par l'équipe ProServices : le client est alors remboursé ou le professionnel payé."],
      ["Commission", "Une commission est prélevée sur chaque mission payée : 15 % jusqu'à 100 €, 10 % jusqu'à 1 000 €, 8 % au-delà. Les professionnels Premium bénéficient d'une réduction de 3 points. Le montant de la commission est affiché avant tout paiement."],
      ["Annulation", "Le client peut annuler une mission tant que le professionnel ne l'a pas acceptée. Une mission payée puis annulée par l'équipe ProServices est remboursée sur le portefeuille du client."],
      ["Avis", "Les avis doivent porter sur une mission réellement effectuée et rester courtois. Un avis signalé peut être masqué par l'équipe de modération."],
      ["Responsabilité", "Les professionnels sont seuls responsables de la qualité de leurs prestations et du respect de leurs obligations légales (statut, assurance, déclarations). ProServices vérifie les documents fournis mais ne garantit pas le résultat des prestations."],
    ],
  },
  confidentialite: {
    title: "Politique de confidentialité",
    sections: [
      ["Données collectées", "Identité et coordonnées (nom, email, téléphone, ville, pays), informations de profil professionnel, missions, messages échangés, avis, historique des paiements, et documents justificatifs déposés par les professionnels."],
      ["Utilisation", "Ces données servent uniquement à faire fonctionner la plateforme : mise en relation, suivi des missions, paiements, vérification des profils, assistance et prévention de la fraude. Elles ne sont jamais vendues."],
      ["Documents justificatifs", "Les pièces d'identité, diplômes et certificats ne sont jamais publics : seuls leur propriétaire et l'équipe d'administration peuvent les consulter."],
      ["Durée de conservation", "Les données sont conservées tant que le compte est actif, puis supprimées ou anonymisées, sauf obligation légale de conservation (par exemple les données de facturation)."],
      ["Vos droits", "Conformément au RGPD, vous pouvez accéder à vos données, les rectifier, les supprimer, vous opposer à leur traitement ou en demander la portabilité en écrivant à contact@proservices.fr. Vous pouvez aussi saisir la CNIL (cnil.fr)."],
      ["Cookies et stockage local", "ProServices n'utilise aucun cookie publicitaire ni outil de suivi. Seul le stockage local de votre navigateur est utilisé pour garder votre session ouverte ; il est effacé à la déconnexion."],
    ],
  },
};

export default function Legal({ page }) {
  const { title, sections } = PAGES[page];
  return (
    <div className="max-w-5xl mx-auto px-4 py-12 lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
      <nav className="flex lg:flex-col gap-1 mb-8 lg:mb-0 overflow-x-auto lg:overflow-visible">
        {Object.entries(PAGES).map(([slug, p]) => (
          <NavLink
            key={slug}
            to={`/${slug}`}
            className={({ isActive }) => `px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap lg:whitespace-normal ${isActive ? "bg-primary-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            {p.title}
          </NavLink>
        ))}
      </nav>
      <article>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{title}</h1>
        <div className="space-y-7">
          {sections.map(([h, text]) => (
            <section key={h}>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{h}</h2>
              <p className="text-gray-600 leading-relaxed">{text}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
