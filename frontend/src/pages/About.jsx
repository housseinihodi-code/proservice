const VALUES = [
  { img: "/images/tool-verif.jpg", title: "Confiance", desc: "Chaque professionnel est vérifié avant de rejoindre la plateforme." },
  { img: "/images/city-paris.jpg", title: "Proximité", desc: "Des professionnels dans le monde entier, en commençant par la France." },
  { img: "/images/step-payer.jpg", title: "Sécurité", desc: "Paiements protégés par un système de séquestre jusqu'à validation." },
  { img: "/images/tool-aide.jpg", title: "Accompagnement", desc: "Un support disponible pour clients et professionnels à chaque étape." },
];

export default function About() {
  return (
    <div>
      <section className="relative text-white py-20 px-4 text-center">
        <img src="/images/hero.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary-900/85" />
        <div className="relative">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">À propos de ProServices</h1>
          <p className="text-primary-100 max-w-2xl mx-auto">La plateforme qui connecte clients et professionnels qualifiés partout dans le monde.</p>
        </div>
      </section>

      <section className="py-16 px-4 max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        <img src="/images/trust.jpg" alt="Poignée de main" className="w-full h-72 object-cover rounded-3xl" />
        <p className="text-gray-700 text-lg leading-relaxed">
          ProServices est né d'un constat simple : trouver un professionnel fiable pour un besoin ponctuel ou récurrent reste souvent compliqué. Notre plateforme met en relation directe des clients avec des experts vérifiés — informatique, BTP, santé, éducation, création et bien d'autres domaines — avec un paiement sécurisé (carte bancaire ou Mobile Money) à chaque étape.
        </p>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map((v) => (
            <div key={v.title} className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
              <img src={v.img} alt={v.title} className="w-full h-36 object-cover" />
              <div className="p-5">
                <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-gray-600 text-sm">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
