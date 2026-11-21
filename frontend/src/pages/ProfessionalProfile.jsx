import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Star, Briefcase, Clock, Globe, Linkedin, MessageSquare, CheckCircle } from "lucide-react";
import { professionalsAPI, evaluationsAPI, mediaUrl } from "../services/api";
import { useAuthStore } from "../store/authStore";
import Loader from "../components/common/Loader";
import { formatLocation } from "../constants/locale";
import StarRating from "../components/common/StarRating";

export default function ProfessionalProfile() {
  const { id } = useParams();
  const { user } = useAuthStore();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["professional", id],
    queryFn: () => professionalsAPI.getById(id).then((r) => r.data),
  });

  const { data: reviews } = useQuery({
    queryKey: ["evaluations", profile?.user?.id],
    queryFn: () => evaluationsAPI.getUserEvaluations(profile.user.id).then((r) => r.data),
    enabled: !!profile?.user?.id,
  });

  if (isLoading) return <Loader />;
  if (!profile) return <div className="text-center py-16 text-gray-500">Profil introuvable</div>;

  const { user: profileUser } = profile;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="space-y-6">
          <div className="card p-6 text-center">
            <div className="relative inline-block mb-4">
              <img
                src={mediaUrl(profileUser.profile_picture_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.first_name + " " + profileUser.last_name)}&background=2563eb&color=fff&size=100`}
                alt={profileUser.first_name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-primary-100 mx-auto"
              />
              {profileUser.is_verified && (
                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900">{profileUser.first_name} {profileUser.last_name}</h1>
            {profile.trades?.length > 0 && <p className="text-accent-600 font-semibold mt-0.5">{profile.trades.join(" · ")}</p>}
            {profileUser.is_verified && <span className="badge badge-green mt-1">Profil vérifié</span>}
            {profile.is_featured && <span className="badge badge-blue mt-1 ml-1">Mis en avant</span>}

            {profile.total_reviews > 0 ? (
              <div className="mt-4 flex items-center justify-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-gray-900">{profile.reputation_score.toFixed(1).replace(".", ",")}</span>
                <span className="text-gray-500 text-sm">({profile.total_reviews} avis)</span>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">Pas encore d'avis</p>
            )}

            <div className="mt-4 space-y-2 text-sm text-gray-600">
              {(profileUser.city || profileUser.country) && <div className="flex items-center justify-center gap-1"><MapPin className="w-4 h-4" />{formatLocation(profileUser.city, profileUser.country)}</div>}
              {profile.years_experience > 0 && <div className="flex items-center justify-center gap-1"><Briefcase className="w-4 h-4" />{profile.years_experience} an(s) d'expérience</div>}
            </div>

            {profile.hourly_rate && (
              <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                <div className="text-2xl font-bold text-primary-700">{profile.hourly_rate.toLocaleString("fr-FR")} €</div>
                <div className="text-xs text-gray-500">par heure</div>
              </div>
            )}

            {user && str(user.id) !== str(profileUser.id) && (
              <div className="mt-4 space-y-2">
                <Link to={`/messages/${profileUser.id}`} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
                  <MessageSquare className="w-4 h-4" /> Contacter
                </Link>
                <Link to={`/missions/creer?professional=${profileUser.id}`} className="btn-secondary w-full py-2.5">
                  Proposer une mission
                </Link>
              </div>
            )}
          </div>

          {/* Links */}
          {(profile.linkedin_url || profile.website_url) && (
            <div className="card p-4 space-y-2">
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-600 hover:underline text-sm">
                  <Linkedin className="w-4 h-4" /> LinkedIn
                </a>
              )}
              {profile.website_url && (
                <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary-600 hover:underline text-sm">
                  <Globe className="w-4 h-4" /> Site web
                </a>
              )}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {profile.bio && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-3">À propos</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{profile.bio}</p>
            </div>
          )}

          {profile.trades?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Métiers</h2>
              <div className="flex flex-wrap gap-2">
                {profile.trades.map((t) => (
                  <Link key={t} to={`/recherche?trade=${encodeURIComponent(t)}`} className="px-3 py-1 rounded-full text-sm font-medium bg-accent-50 text-accent-700 hover:bg-accent-100">{t}</Link>
                ))}
              </div>
            </div>
          )}

          {profile.competence_domains?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Domaines de compétences</h2>
              <div className="flex flex-wrap gap-2">
                {profile.competence_domains.map((d) => (
                  <span key={d} className="badge badge-blue">{d}</span>
                ))}
              </div>
            </div>
          )}

          {profile.skills?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Compétences techniques</h2>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span key={s} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Évaluations ({reviews?.total || 0})</h2>
            {reviews?.items?.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucune évaluation pour le moment</p>
            ) : (
              <div className="space-y-4">
                {reviews?.items?.map((review) => (
                  <div key={review.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent((review.author?.first_name || "U") + " " + (review.author?.last_name || ""))}&size=32&background=e5e7eb&color=374151`}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="font-medium text-sm text-gray-900">{review.author?.first_name} {review.author?.last_name}</span>
                      </div>
                      <StarRating value={review.rating} readonly size="sm" />
                    </div>
                    {review.comment && <p className="text-gray-700 text-sm">{review.comment}</p>}
                    {review.response && (
                      <div className="mt-2 pl-3 border-l-2 border-primary-200 text-sm text-gray-600 italic">
                        Réponse : {review.response}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{new Date(review.created_at).toLocaleDateString("fr-FR")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function str(v) { return String(v); }
