import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Plus, MapPin, Clock, X, Users, CheckCircle, Send } from "lucide-react";
import { offersAPI, tradesAPI, mediaUrl } from "../services/api";
import { useAuthStore } from "../store/authStore";
import Loader from "../components/common/Loader";
import Modal from "../components/common/Modal";
import { Field, SubmitButton } from "../components/common/Form";

import { COUNTRIES, DOMAINS, DEFAULT_COUNTRY, formatLocation, formatMoney, groupTradesByDomain, apiError } from "../constants/locale";

const APP_STATUS = {
  PENDING: ["En attente", "badge-yellow"],
  ACCEPTED: ["Retenue", "badge-green"],
  REJECTED: ["Non retenue", "badge-red"],
};

function OfferCard({ offer, onApply, onView, onViewApplications, onClose, isPro, isOwner }) {
  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-gray-900 text-lg leading-snug">{offer.title}</h3>
        <span className={`badge flex-shrink-0 ${offer.status === "OPEN" ? "badge-green" : offer.status === "IN_PROGRESS" ? "badge-blue" : offer.status === "CLOSED" ? "badge-gray" : "badge-red"}`}>
          {offer.status === "OPEN" ? "Ouverte" : offer.status === "IN_PROGRESS" ? "En cours" : offer.status === "CLOSED" ? "Fermée" : "Annulée"}
        </span>
      </div>
      <p className="text-gray-600 text-sm line-clamp-3 mb-4">{offer.description}</p>
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{formatLocation(offer.location_city, offer.location_country) || "Partout / à distance"}</span>
        {offer.deadline && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Avant le {new Date(offer.deadline).toLocaleDateString("fr-FR")}</span>}
        {offer.trade && <span className="badge bg-accent-50 text-accent-700">{offer.trade}</span>}
        <span className="badge badge-blue">{offer.domain}</span>
        {offer.applications_count != null && <span className="text-gray-400">{offer.applications_count} candidature(s)</span>}
      </div>
      {(offer.budget_min || offer.budget_max) && (
        <div className="text-sm font-semibold text-primary-700 mb-4">
          Budget : {offer.budget_min?.toLocaleString("fr-FR") || "?"} – {offer.budget_max?.toLocaleString("fr-FR") || "?"} €
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => onView(offer)} className="btn-secondary text-sm py-1.5 px-4">Voir détails</button>
        {isPro && offer.status === "OPEN" && (
          <button onClick={() => onApply(offer)} className="btn-primary text-sm py-1.5 px-4">Postuler</button>
        )}
        {isOwner && (
          <button onClick={() => onViewApplications(offer)} className="btn-accent text-sm py-1.5 px-4 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Candidatures
          </button>
        )}
        {isOwner && offer.status === "OPEN" && (
          <button onClick={() => onClose(offer)} className="text-sm py-1.5 px-3 text-gray-500 hover:text-red-600">Clôturer</button>
        )}
      </div>
    </div>
  );
}

export default function Offers() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isClient = user?.role === "CLIENT";
  const isPro = user?.role === "PROFESSIONAL";
  const [page, setPage] = useState(1);
  const [view, setView] = useState("all"); // all | mine | applications
  const [trade, setTrade] = useState("");
  const [domain, setDomain] = useState("");
  const [search, setSearch] = useState("");
  const [createModal, setCreateModal] = useState(false);
  const [applyModal, setApplyModal] = useState(null);
  const [viewOffer, setViewOffer] = useState(null);
  const [applicationsOffer, setApplicationsOffer] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["offers", view, page, domain, trade, search],
    queryFn: () => (view === "mine"
      ? offersAPI.mine({ page, size: 12 })
      : offersAPI.list({ page, size: 12, domain: domain || undefined, trade: trade || undefined, search: search || undefined, status: "OPEN" })
    ).then((r) => r.data),
    enabled: view !== "applications",
    keepPreviousData: true,
  });

  const { data: myApplications, isLoading: myAppsLoading } = useQuery({
    queryKey: ["my-applications"],
    queryFn: () => offersAPI.myApplications().then((r) => r.data),
    enabled: isPro,
  });

  const { data: trades } = useQuery({
    queryKey: ["trades"],
    queryFn: () => tradesAPI.list().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const tradeGroups = groupTradesByDomain((trades || []).filter((t) => !domain || t.domain === domain));
  const [createDomain, setCreateDomain] = useState("");
  const createTradeGroups = groupTradesByDomain((trades || []).filter((t) => !createDomain || t.domain === createDomain));
  const appliedOfferIds = new Set((myApplications || []).map((a) => a.offer_id));

  const { data: applications, isLoading: applicationsLoading } = useQuery({
    queryKey: ["offer-applications", applicationsOffer?.id],
    queryFn: () => offersAPI.getApplications(applicationsOffer.id).then((r) => r.data),
    enabled: !!applicationsOffer,
  });

  const { register: regCreate, handleSubmit: handleCreate, reset: resetCreate, watch: watchCreate, formState: { errors: createErrors } } = useForm({ mode: "onTouched", defaultValues: { location_country: DEFAULT_COUNTRY } });
  const { register: regApply, handleSubmit: handleApply, reset: resetApply, watch: watchApply, formState: { errors: applyErrors } } = useForm({ mode: "onTouched" });
  const coverLength = (watchApply("cover_letter") || "").trim().length;
  const offerDescLength = (watchCreate("description") || "").trim().length;

  const createMutation = useMutation({
    mutationFn: (d) => offersAPI.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["offers"] }); toast.success("Offre publiée !"); setCreateModal(false); resetCreate({ location_country: DEFAULT_COUNTRY }); setView("mine"); },
    onError: (e) => toast.error(apiError(e)),
  });

  const applyMutation = useMutation({
    mutationFn: ({ offerId, data }) => offersAPI.apply(offerId, data),
    onSuccess: () => { toast.success("Candidature envoyée !"); setApplyModal(null); resetApply(); queryClient.invalidateQueries({ queryKey: ["my-applications"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const acceptMutation = useMutation({
    mutationFn: (applicationId) => offersAPI.acceptApplication(applicationsOffer.id, applicationId),
    onSuccess: (res) => {
      toast.success("Candidature acceptée ! Créez la mission pour lancer le paiement.");
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      const offerId = applicationsOffer.id;
      setApplicationsOffer(null);
      navigate(`/missions/creer?professional=${res.data.professional_user_id}&offer=${offerId}`);
    },
    onError: (e) => toast.error(apiError(e)),
  });

  const rejectMutation = useMutation({
    mutationFn: (applicationId) => offersAPI.rejectApplication(applicationsOffer.id, applicationId),
    onSuccess: () => { toast.success("Candidature déclinée"); queryClient.invalidateQueries({ queryKey: ["offer-applications"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const closeMutation = useMutation({
    mutationFn: (offer) => offersAPI.update(offer.id, { status: "CLOSED" }),
    onSuccess: () => { toast.success("Offre clôturée"); queryClient.invalidateQueries({ queryKey: ["offers"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const tabs = [["all", "Offres ouvertes"], isClient && ["mine", "Mes offres"], isPro && ["applications", `Mes candidatures${myApplications?.length ? ` (${myApplications.length})` : ""}`]].filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Offres de mission</h1>
          <p className="text-gray-500 mt-1">
            {view === "applications" ? `${myApplications?.length || 0} candidature(s) envoyée(s)` : view === "mine" ? `${data?.total || 0} offre(s) publiée(s)` : `${data?.total || 0} offre(s) disponible(s)`}
          </p>
        </div>
        {isClient && (
          <button onClick={() => setCreateModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Publier une offre
          </button>
        )}
      </div>

      {tabs.length > 1 && (
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-full w-fit">
          {tabs.map(([val, label]) => (
            <button key={val} onClick={() => { setView(val); setPage(1); }} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${view === val ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>{label}</button>
          ))}
        </div>
      )}

      {/* Filters */}
      {view === "all" && (
      <div className="flex gap-3 mb-6 flex-wrap">
        <input className="input-field max-w-xs" placeholder="Rechercher..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className="input-field max-w-xs" value={domain} onChange={(e) => { setDomain(e.target.value); setTrade(""); setPage(1); }}>
          <option value="">Tous les domaines</option>
          {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="input-field max-w-xs" value={trade} onChange={(e) => { setTrade(e.target.value); setPage(1); }}>
          <option value="">Tous les métiers</option>
          {tradeGroups.map((g) => (
            <optgroup key={g.domain} label={g.domain}>
              {g.trades.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </optgroup>
          ))}
        </select>
        {(domain || search || trade) && (
          <button onClick={() => { setDomain(""); setSearch(""); setTrade(""); }} className="btn-secondary flex items-center gap-1 text-red-600">
            <X className="w-4 h-4" /> Réinitialiser
          </button>
        )}
      </div>
      )}

      {view === "applications" ? (
        myAppsLoading ? <Loader /> : !myApplications?.length ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-medium text-gray-700">Aucune candidature pour l'instant</p>
            <button onClick={() => setView("all")} className="btn-primary mt-4">Parcourir les offres</button>
          </div>
        ) : (
          <div className="space-y-3">
            {myApplications.map((a) => {
              const [label, badge] = APP_STATUS[a.status] || APP_STATUS.PENDING;
              return (
                <div key={a.id} className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{a.offer?.title || "Offre supprimée"}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {a.offer?.client && `${a.offer.client.first_name} ${a.offer.client.last_name} · `}
                      Envoyée le {new Date(a.created_at).toLocaleDateString("fr-FR")}
                      {a.proposed_rate ? ` · ${formatMoney(a.proposed_rate)} proposés` : ""}
                    </p>
                    {a.status === "ACCEPTED" && <p className="text-sm text-green-700 mt-1">Le client vous a retenu : la mission apparaîtra dans « Mes missions » dès qu'il l'aura créée.</p>}
                  </div>
                  <span className={`badge ${badge} self-start sm:self-center`}>{label}</span>
                  {a.offer?.client && (
                    <button onClick={() => navigate(`/messages/${a.offer.client_id}`)} className="btn-secondary text-sm py-1.5 px-4">Contacter</button>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : isLoading ? <Loader /> : data?.items?.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium text-gray-600">{view === "mine" ? "Vous n'avez publié aucune offre" : "Aucune offre disponible"}</p>
          <p className="text-sm">{view === "mine" ? "Publiez une offre pour recevoir des candidatures." : "Essayez des critères différents"}</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data?.items?.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                isPro={isPro && !appliedOfferIds.has(offer.id)}
                isOwner={isClient && String(offer.client_id) === String(user?.id)}
                onApply={user ? setApplyModal : () => navigate("/connexion")}
                onClose={(o) => window.confirm("Clôturer cette offre ? Elle ne recevra plus de candidatures.") && closeMutation.mutate(o)}
                onView={setViewOffer}
                onViewApplications={setApplicationsOffer}
              />
            ))}
          </div>
          {data?.pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-4 py-2 disabled:opacity-50">Précédent</button>
              <span className="px-4 py-2 text-gray-600">{page} / {data.pages}</span>
              <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="btn-secondary px-4 py-2 disabled:opacity-50">Suivant</button>
            </div>
          )}
        </>
      )}

      {/* Create offer modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Publier une offre de mission">
        <form noValidate onSubmit={handleCreate((d) => createMutation.mutate({ ...d, title: d.title.trim(), description: d.description.trim() }))} className="space-y-4">
          <Field label="Titre de l'offre" required error={createErrors.title?.message}>
            <input placeholder="Ex. : Développeur React pour une application mobile" maxLength={255} {...regCreate("title", {
              required: "Donnez un titre à votre offre",
              validate: (v) => v.trim().length >= 5 || "5 caractères minimum",
            })} />
          </Field>
          <Field label="Description" required error={createErrors.description?.message} counter={[offerDescLength, 20]} hint="20 caractères minimum : besoins, livrables, délais…">
            <textarea rows={4} placeholder="Décrivez vos besoins précisément…" {...regCreate("description", {
              required: "Décrivez votre besoin",
              validate: (v) => v.trim().length >= 20 || "20 caractères minimum",
            })} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Domaine" required error={createErrors.domain?.message}>
              <select {...regCreate("domain", { required: "Choisissez un domaine", onChange: (e) => setCreateDomain(e.target.value) })}>
                <option value="">Sélectionner…</option>
                {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Métier recherché" optional>
              <select {...regCreate("trade")}>
                <option value="">Indifférent</option>
                {createTradeGroups.map((g) => (
                  <optgroup key={g.domain} label={g.domain}>
                    {g.trades.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </Field>
            <Field label="Pays">
              <select {...regCreate("location_country")}>
                <option value="">Tous les pays</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Ville" optional>
              <input placeholder="Laisser vide si à distance" {...regCreate("location_city")} />
            </Field>
            <Field label="Budget minimum (€)" optional error={createErrors.budget_min?.message}>
              <input type="number" inputMode="decimal" min={0} placeholder="100" {...regCreate("budget_min", { min: { value: 0, message: "Montant positif attendu" } })} />
            </Field>
            <Field label="Budget maximum (€)" optional error={createErrors.budget_max?.message}>
              <input type="number" inputMode="decimal" min={0} placeholder="500" {...regCreate("budget_max", {
                min: { value: 0, message: "Montant positif attendu" },
                validate: (v, all) => !v || !all.budget_min || Number(v) >= Number(all.budget_min) || "Doit être supérieur ou égal au minimum",
              })} />
            </Field>
          </div>
          <Field label="Date limite" optional error={createErrors.deadline?.message}>
            <input type="datetime-local" {...regCreate("deadline", { validate: (v) => !v || new Date(v) > new Date() || "La date limite doit être dans le futur" })} />
          </Field>
          <SubmitButton loading={createMutation.isPending} loadingText="Publication…" icon={Plus} className="btn-primary w-full">
            Publier l'offre
          </SubmitButton>
        </form>
      </Modal>

      {/* Apply modal */}
      <Modal isOpen={!!applyModal} onClose={() => setApplyModal(null)} title={`Postuler — ${applyModal?.title}`}>
        <form noValidate onSubmit={handleApply((d) => applyMutation.mutate({ offerId: applyModal.id, data: { ...d, cover_letter: d.cover_letter.trim() } }))} className="space-y-4">
          <Field label="Lettre de motivation" required error={applyErrors.cover_letter?.message} counter={[coverLength, 50]} hint="50 caractères minimum : expérience, disponibilités, approche proposée.">
            <textarea rows={6} placeholder="Présentez-vous et expliquez pourquoi vous êtes le bon profil pour cette mission…" {...regApply("cover_letter", {
              required: "Rédigez quelques lignes de présentation",
              validate: (v) => v.trim().length >= 50 || `Encore ${50 - v.trim().length} caractère(s) minimum`,
            })} />
          </Field>
          <Field label="Tarif proposé (€)" optional hint="Laissez vide pour utiliser le tarif de votre profil." error={applyErrors.proposed_rate?.message}>
            <input type="number" inputMode="decimal" min={0} placeholder="Ex. : 350" {...regApply("proposed_rate", { min: { value: 0, message: "Montant positif attendu" } })} />
          </Field>
          <SubmitButton loading={applyMutation.isPending} loadingText="Envoi…" icon={Send} className="btn-primary w-full">
            Envoyer ma candidature
          </SubmitButton>
        </form>
      </Modal>

      {/* View offer modal */}
      <Modal isOpen={!!viewOffer} onClose={() => setViewOffer(null)} title={viewOffer?.title}>
        {viewOffer && (
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">{viewOffer.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Domaine :</span> <strong>{viewOffer.domain}</strong></div>
              {viewOffer.trade && <div><span className="text-gray-500">Métier :</span> <strong>{viewOffer.trade}</strong></div>}
              <div><span className="text-gray-500">Lieu :</span> <strong>{formatLocation(viewOffer.location_city, viewOffer.location_country) || "Partout / à distance"}</strong></div>
              {viewOffer.budget_min && <div><span className="text-gray-500">Budget min :</span> <strong>{viewOffer.budget_min?.toLocaleString("fr-FR")} €</strong></div>}
              {viewOffer.budget_max && <div><span className="text-gray-500">Budget max :</span> <strong>{viewOffer.budget_max?.toLocaleString("fr-FR")} €</strong></div>}
              {viewOffer.deadline && <div className="col-span-2"><span className="text-gray-500">Date limite :</span> <strong>{new Date(viewOffer.deadline).toLocaleDateString("fr-FR")}</strong></div>}
            </div>
            {isPro && viewOffer.status === "OPEN" && !appliedOfferIds.has(viewOffer.id) && (
              <button onClick={() => { setViewOffer(null); setApplyModal(viewOffer); }} className="btn-primary w-full">Postuler à cette offre</button>
            )}
          </div>
        )}
      </Modal>

      {/* Applications modal */}
      <Modal isOpen={!!applicationsOffer} onClose={() => setApplicationsOffer(null)} title={`Candidatures — ${applicationsOffer?.title}`}>
        {applicationsLoading ? <Loader /> : applications?.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Aucune candidature pour l'instant</p>
        ) : (
          <div className="space-y-4">
            {applications?.map((app) => (
              <div key={app.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={mediaUrl(app.professional?.profile_picture_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent((app.professional?.first_name || "P") + " " + (app.professional?.last_name || ""))}&background=6366f1&color=fff&size=40`}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{app.professional?.first_name} {app.professional?.last_name}</p>
                      {app.proposed_rate && <p className="text-xs text-gray-500">Tarif proposé : {app.proposed_rate.toLocaleString("fr-FR")} €</p>}
                    </div>
                  </div>
                  <span className={`badge flex-shrink-0 ${app.status === "ACCEPTED" ? "badge-green" : app.status === "REJECTED" ? "badge-red" : "badge-yellow"}`}>
                    {app.status === "ACCEPTED" ? "Acceptée" : app.status === "REJECTED" ? "Rejetée" : "En attente"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{app.cover_letter}</p>
                {app.status === "PENDING" && applicationsOffer?.status === "OPEN" && (
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => acceptMutation.mutate(app.id)} disabled={acceptMutation.isPending} className="btn-accent text-sm py-1.5 px-4 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Retenir et créer la mission
                    </button>
                    <button onClick={() => rejectMutation.mutate(app.id)} disabled={rejectMutation.isPending} className="btn-secondary text-sm py-1.5 px-4">Décliner</button>
                    <button onClick={() => navigate(`/messages/${app.professional_user_id}`)} className="text-sm py-1.5 px-3 text-primary-700 hover:underline">Contacter</button>
                  </div>
                )}
                {app.status === "ACCEPTED" && (
                  <button onClick={() => navigate(`/missions/creer?professional=${app.professional_user_id}&offer=${applicationsOffer.id}`)} className="text-sm text-primary-700 font-medium hover:underline">
                    Créer la mission pour ce professionnel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
