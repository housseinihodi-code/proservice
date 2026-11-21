import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  { q: "Comment fonctionne le paiement sécurisé ?", a: "Lorsqu'une mission est acceptée, le client paie par carte bancaire, Mobile Money ou son portefeuille ProServices. Les fonds sont conservés en séquestre et libérés au professionnel uniquement après validation du livrable par le client." },
  { q: "Comment devenir professionnel vérifié ?", a: "Inscrivez-vous en choisissant le profil « Je propose mes services », complétez votre profil puis déposez vos documents (diplômes, certificats, pièce d'identité) depuis votre tableau de bord. Notre équipe les valide sous quelques jours." },
  { q: "Quels moyens de paiement sont acceptés ?", a: "Carte bancaire, MTN Mobile Money, Orange Money, ainsi que le portefeuille numérique ProServices Cash pour des transferts instantanés entre utilisateurs." },
  { q: "Que se passe-t-il en cas de litige sur une mission ?", a: "Le client peut ouvrir un litige au lieu de valider le livrable. Notre équipe d'administration examine le dossier et arbitre en faveur du client ou du professionnel." },
  { q: "La plateforme prélève-t-elle une commission ?", a: "Oui, une commission dégressive est appliquée selon le montant de la mission (8 à 15%), déduite automatiquement du paiement versé au professionnel." },
  { q: "Comment fonctionne le portefeuille ProServices Cash ?", a: "Vous pouvez recharger votre portefeuille par carte bancaire ou Mobile Money et transférer des fonds instantanément vers un autre utilisateur en utilisant son email ou son numéro de téléphone." },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 p-5 text-left">
        <span className="font-medium text-gray-900">{q}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5 text-gray-600 text-sm leading-relaxed">{a}</div>}
    </div>
  );
}

export default function FAQ() {
  return (
    <div>
      <section className="bg-hero-gradient text-white py-16 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Questions fréquentes</h1>
        <p className="text-primary-100 max-w-xl mx-auto">Tout ce qu'il faut savoir pour bien démarrer sur ProServices.</p>
      </section>
      <section className="py-16 px-4 max-w-3xl mx-auto space-y-3">
        {FAQS.map((f) => <FAQItem key={f.q} {...f} />)}
      </section>
    </div>
  );
}
