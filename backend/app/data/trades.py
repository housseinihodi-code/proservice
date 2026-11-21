"""Catalogue initial des métiers, regroupés par domaine.

Il est inséré dans la collection `trades` au premier démarrage ; les
administrateurs peuvent ensuite ajouter, renommer ou désactiver des métiers.
"""

DEFAULT_TRADES = {
    "Informatique & Tech": [
        "Développeur web", "Développeur mobile", "Développeur back-end", "Data analyst",
        "Data scientist", "Administrateur systèmes et réseaux", "Ingénieur DevOps",
        "Expert en cybersécurité", "Technicien informatique", "Chef de projet digital",
    ],
    "Conseil & Gestion": [
        "Expert-comptable", "Comptable", "Consultant en stratégie", "Contrôleur de gestion",
        "Conseiller en recrutement", "Assistant administratif", "Community manager",
        "Chargé de marketing digital", "Traducteur", "Commercial indépendant",
    ],
    "Ingénierie & BTP": [
        "Électricien", "Plombier", "Maçon", "Menuisier", "Peintre en bâtiment",
        "Carreleur", "Couvreur", "Chauffagiste", "Architecte", "Dessinateur-projeteur",
        "Ingénieur structure", "Géomètre-topographe",
    ],
    "Santé & Paramédical": [
        "Infirmier", "Aide-soignant", "Kinésithérapeute", "Ostéopathe", "Psychologue",
        "Diététicien", "Orthophoniste", "Sage-femme", "Médecin généraliste",
    ],
    "Éducation & Formation": [
        "Professeur particulier", "Professeur de mathématiques", "Professeur de langues",
        "Formateur professionnel", "Coach scolaire", "Professeur de musique",
        "Coach sportif", "Formateur en informatique",
    ],
    "Création & Design": [
        "Graphiste", "Designer UX/UI", "Photographe", "Vidéaste", "Monteur vidéo",
        "Illustrateur", "Rédacteur web", "Décorateur d'intérieur", "Motion designer",
    ],
    "Services à la personne": [
        "Agent d'entretien", "Garde d'enfants", "Aide à domicile", "Jardinier",
        "Déménageur", "Chauffeur", "Cuisinier à domicile", "Coiffeur à domicile",
        "Esthéticienne", "Petsitter",
    ],
    "Droit & Juridique": [
        "Avocat", "Juriste d'entreprise", "Notaire", "Huissier de justice",
        "Conseiller juridique", "Médiateur", "Expert en propriété intellectuelle",
    ],
}
