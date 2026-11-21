import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronRight } from "lucide-react";
import { tradesAPI } from "../services/api";
import Loader from "../components/common/Loader";
import { DOMAIN_IMAGES, groupTradesByDomain } from "../constants/locale";

function normalize(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function Trades() {
  const [query, setQuery] = useState("");
  const { data: trades, isLoading } = useQuery({
    queryKey: ["trades"],
    queryFn: () => tradesAPI.list().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const groups = useMemo(() => {
    const q = normalize(query.trim());
    const filtered = (trades || []).filter((t) => !q || normalize(t.name).includes(q) || normalize(t.domain).includes(q));
    return groupTradesByDomain(filtered);
  }, [trades, query]);

  return (
    <div>
      <section className="relative text-white py-16 px-4">
        <img src="/images/domain-btp.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-primary-900/80" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Tous les métiers</h1>
          <p className="text-primary-100 mb-8">
            {trades ? `${trades.length} métiers dans ${groupTradesByDomain(trades).length} domaines` : "Trouvez le professionnel qu'il vous faut"}
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              className="w-full rounded-full py-3.5 pl-12 pr-5 text-gray-900 shadow-lg focus:outline-none focus:ring-4 focus:ring-accent-500/40"
              placeholder="Rechercher un métier : plombier, graphiste, avocat..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12">
        {isLoading ? <Loader /> : groups.length === 0 ? (
          <p className="text-center text-gray-500 py-12">Aucun métier ne correspond à « {query} ».</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map(({ domain, trades: list }) => (
              <div key={domain} className="bg-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col">
                <Link to={`/recherche?domain=${encodeURIComponent(domain)}`} className="relative h-32 block group">
                  {DOMAIN_IMAGES[domain] && (
                    <img src={DOMAIN_IMAGES[domain]} alt={domain} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-900/90 to-primary-900/20" />
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <h2 className="font-bold text-lg">{domain}</h2>
                    <p className="text-xs text-primary-100">{list.length} métier(s)</p>
                  </div>
                </Link>
                <ul className="divide-y divide-gray-100 flex-1">
                  {list.map((t) => (
                    <li key={t.id}>
                      <Link
                        to={`/recherche?trade=${encodeURIComponent(t.name)}`}
                        className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-gray-800 group-hover:text-primary-700 font-medium">{t.name}</span>
                        <span className="flex items-center gap-2 text-xs text-gray-400">
                          {t.professionals_count > 0 && <span>{t.professionals_count} pro{t.professionals_count > 1 ? "s" : ""}</span>}
                          {t.open_offers_count > 0 && <span className="badge badge-green">{t.open_offers_count} offre{t.open_offers_count > 1 ? "s" : ""}</span>}
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-600" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
