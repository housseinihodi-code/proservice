import { formatLocation } from "../../constants/locale";
import { Link } from "react-router-dom";
import { mediaUrl } from "../../services/api";
import { MapPin, Star, CheckCircle, Briefcase } from "lucide-react";

export default function ProfileCard({ professional }) {
  const { user, bio, hourly_rate, competence_domains, trades, skills, reputation_score, total_reviews, is_featured, is_premium, badges } = professional;

  return (
    <div className={`group card lift flex flex-col h-full hover:border-primary-100 ${is_featured ? "ring-2 ring-yellow-400" : ""}`}>
      {is_featured && (
        <div className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 text-center uppercase tracking-wide">
          Mis en avant
        </div>
      )}

      <div className="p-6 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <img
              src={mediaUrl(user?.profile_picture_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent((user?.first_name || "U") + " " + (user?.last_name || ""))}&background=2563eb&color=fff&size=56`}
              alt={user?.first_name}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-soft transition-transform duration-500 group-hover:scale-110"
            />
            {user?.is_verified && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate transition-colors group-hover:text-primary-700">{user?.first_name} {user?.last_name}</h3>
            {trades?.length > 0 && (
              <p className="text-sm font-medium text-accent-600 truncate">{trades.slice(0, 2).join(" · ")}{trades.length > 2 ? ` +${trades.length - 2}` : ""}</p>
            )}
            {user?.city && (
              <div className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{formatLocation(user.city, user.country)}</span>
              </div>
            )}
            {total_reviews > 0 ? (
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold text-gray-900">{(reputation_score || 0).toFixed(1).replace(".", ",")}</span>
                <span className="text-xs text-gray-400">({total_reviews} avis)</span>
              </div>
            ) : (
              <span className="inline-block mt-1 text-xs font-medium text-primary-700 bg-primary-50 rounded-full px-2 py-0.5 whitespace-nowrap">Nouveau</span>
            )}
          </div>
        </div>

        {/* Domains */}
        {competence_domains?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {competence_domains.slice(0, 2).map((d) => (
              <span key={d} className="badge badge-blue text-xs">{d}</span>
            ))}
            {competence_domains.length > 2 && (
              <span className="badge badge-gray text-xs">+{competence_domains.length - 2}</span>
            )}
          </div>
        )}

        {/* Bio */}
        {bio && <p className="text-gray-600 text-sm line-clamp-2 mb-4 flex-1">{bio}</p>}

        {/* Skills */}
        {skills?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {skills.slice(0, 4).map((s) => (
              <span key={s} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{s}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
          {hourly_rate ? (
            <div>
              <span className="text-lg font-bold text-primary-700">{hourly_rate.toLocaleString("fr-FR")}</span>
              <span className="text-xs text-gray-500"> €/h</span>
            </div>
          ) : (
            <span className="text-sm text-gray-400">Sur devis</span>
          )}
          <Link to={`/professionnels/${professional.id}`} className="btn-accent text-sm py-1.5 px-4">
            Voir profil
          </Link>
        </div>
      </div>
    </div>
  );
}

export function ProfileCardSkeleton() {
  return (
    <div className="card p-6 flex flex-col gap-4" aria-hidden="true">
      <div className="flex items-center gap-4">
        <div className="skeleton w-14 h-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
        </div>
      </div>
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-5/6" />
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <div className="skeleton h-4 w-16" />
        <div className="skeleton h-8 w-24 rounded-full" />
      </div>
    </div>
  );
}
