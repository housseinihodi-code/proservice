import { Link } from "react-router-dom";

const STEPS = [
  { step: "1", img: "/images/step-besoin.jpg", title: "Publiez votre besoin", desc: "Décrivez votre projet, votre budget et vos délais en quelques minutes." },
  { step: "2", img: "/images/step-comparer.jpg", title: "Recevez des candidatures", desc: "Les professionnels qualifiés correspondant à votre besoin postulent directement." },
  { step: "3", img: "/images/trust.jpg", title: "Choisissez & collaborez", desc: "Échangez, mettez-vous d'accord et suivez l'avancement en temps réel." },
  { step: "4", img: "/images/step-payer.jpg", title: "Payez en toute sécurité", desc: "Payez par carte bancaire, Mobile Money ou avec votre portefeuille ProServices. Le paiement est sécurisé jusqu'à validation." },
];

export default function HowItWorks() {
  return (
    <div>
      <section className="relative text-white py-20 px-4 text-center">
        <img src="/images/hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary-900/85" />
        <div className="relative">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Comment ça marche ?</h1>
          <p className="text-primary-100 max-w-xl mx-auto">De la publication de votre besoin au paiement sécurisé, découvrez le parcours ProServices.</p>
        </div>
      </section>

      <section className="py-16 px-4 max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <div key={s.step} className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
              <div className="relative">
                <img src={s.img} alt={s.title} className="w-full h-40 object-cover" />
                <span className="absolute top-3 left-3 bg-white text-primary-800 font-extrabold text-sm rounded-full w-9 h-9 flex items-center justify-center shadow">{s.step}</span>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-600 text-sm">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl bg-primary-50 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Prêt à commencer ?</h2>
          <p className="text-gray-600 mb-6">Publiez votre première mission ou proposez vos services dès aujourd'hui.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/offres" className="btn-primary px-6 py-3">Publier une mission</Link>
            <Link to="/inscription?role=pro" className="btn-secondary px-6 py-3">Devenir professionnel</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
