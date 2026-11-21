import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Briefcase, Info, FileText, Wallet, CalendarClock, Type, ShieldCheck, ArrowLeft } from "lucide-react";
import { professionalsAPI, missionsAPI, offersAPI, mediaUrl } from "../services/api";
import Loader from "../components/common/Loader";
import { computeCommission, apiError } from "../constants/locale";
import { Field, SubmitButton } from "../components/common/Form";

export default function CreateMission() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const professionalIdParam = searchParams.get("professional");
  const offerIdParam = searchParams.get("offer");

  const { data: professional, isLoading: proLoading } = useQuery({
    queryKey: ["professional", professionalIdParam],
    // Le paramètre « professional » est l'identifiant UTILISATEUR du pro (celui qu'attend l'API missions).
    queryFn: () => professionalsAPI.getByUserId(professionalIdParam).then((r) => r.data),
    enabled: !!professionalIdParam,
  });

  const { data: offer } = useQuery({
    queryKey: ["offer", offerIdParam],
    queryFn: () => offersAPI.getById(offerIdParam).then((r) => r.data),
    enabled: !!offerIdParam,
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    mode: "onTouched",
    defaultValues: { professional_id: professionalIdParam || "" },
  });

  // Mission issue d'une offre : on reprend son titre, sa description et son budget.
  useEffect(() => {
    if (!offer) return;
    setValue("title", offer.title);
    setValue("description", offer.description);
    if (offer.budget_max) setValue("amount", offer.budget_max);
  }, [offer, setValue]);

  const amount = parseFloat(watch("amount") || 0);
  const description = watch("description") || "";
  // Date limite : au plus tôt dans une heure (format attendu par <input type="datetime-local">).
  const minDeadline = new Date(Date.now() + 3600e3 - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 16);
  const commission = computeCommission(amount);
  const net = amount - commission;

  const createMutation = useMutation({
    mutationFn: (data) => missionsAPI.create(data),
    onSuccess: () => {
      toast.success("Mission créée avec succès !");
      navigate("/missions");
    },
    onError: (err) => toast.error(apiError(err, "Erreur lors de la création")),
  });

  const onSubmit = (data) => {
    createMutation.mutate({
      ...data,
      title: data.title.trim(),
      description: data.description.trim(),
      amount: parseFloat(data.amount),
      offer_id: offerIdParam || undefined,
    });
  };

  if (proLoading) return <Loader />;

  const rate = amount < 100 ? "15 %" : amount <= 1000 ? "10 %" : "8 %";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      <button type="button" onClick={() => navigate(-1)} className="group inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 mb-5">
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" /> Retour
      </button>
      <p className="eyebrow mb-2"><span className="w-6 h-px bg-accent-500" />Nouvelle mission</p>
      <h1 className="text-3xl sm:text-4xl text-gray-900 mb-2">Proposer une mission</h1>
      <p className="text-gray-500 mb-8">Décrivez votre besoin : le professionnel l'accepte, puis vous réglez en toute sécurité.</p>

      {professional && (
        <div className="form-section !p-4 sm:!p-5 mb-6 flex items-center gap-4">
          <img
            src={mediaUrl(professional.user?.profile_picture_url) || `https://ui-avatars.com/api/?name=${encodeURIComponent((professional.user?.first_name || "") + " " + (professional.user?.last_name || ""))}&background=2563eb&color=fff&size=96`}
            alt=""
            className="w-14 h-14 rounded-2xl object-cover ring-4 ring-primary-50"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Professionnel</p>
            <p className="font-bold text-gray-900 truncate">{professional.user?.first_name} {professional.user?.last_name}</p>
            <p className="text-sm text-gray-500 truncate">{professional.competence_domains?.slice(0, 2).join(" · ")}</p>
          </div>
          {professional.hourly_rate && (
            <div className="ml-auto text-right flex-shrink-0">
              <p className="font-display font-extrabold text-primary-700">{professional.hourly_rate?.toLocaleString("fr-FR")} €</p>
              <p className="text-xs text-gray-400">par heure</p>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <section className="form-section space-y-5">
          <h2 className="form-section-title"><span className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center"><FileText className="w-[1.1rem] h-[1.1rem]" /></span>Détails de la mission</h2>

          {!professionalIdParam && (
            <div className="rounded-2xl bg-primary-50 border border-primary-100 p-4 text-sm text-primary-900 flex gap-3">
              <Info className="w-5 h-5 flex-shrink-0 text-primary-600" />
              <div>
                Choisissez d'abord un professionnel : ouvrez sa fiche depuis la{" "}
                <Link to="/recherche" className="font-semibold underline">recherche</Link> puis cliquez sur « Proposer une mission ».
                Vous pouvez quand même utiliser le simulateur de commission ci-dessous.
                <input type="hidden" {...register("professional_id", { required: "Choisissez un professionnel" })} />
                {errors.professional_id && <p role="alert" className="form-error">{errors.professional_id.message}</p>}
              </div>
            </div>
          )}

          <Field label="Titre de la mission" required icon={Type} error={errors.title?.message} hint="Un titre court et précis attire plus vite l'attention.">
            <input placeholder="Ex. : Rénovation d'une salle de bain de 6 m²" maxLength={255} {...register("title", {
              required: "Donnez un titre à votre mission",
              validate: (v) => v.trim().length >= 5 || "5 caractères minimum",
            })} />
          </Field>

          <Field label="Description détaillée" required error={errors.description?.message} counter={[description.trim().length, 20]} hint="Besoins, livrables attendus, contraintes, accès au lieu…">
            <textarea rows={7} placeholder="Décrivez précisément ce que vous attendez du professionnel." {...register("description", {
              required: "Décrivez votre besoin",
              validate: (v) => v.trim().length >= 20 || "20 caractères minimum, pour que le professionnel comprenne bien",
            })} />
          </Field>

          <Field label="Date limite" optional icon={CalendarClock} error={errors.deadline?.message}>
            <input type="datetime-local" min={minDeadline} {...register("deadline", {
              validate: (v) => !v || new Date(v) > new Date() || "La date limite doit être dans le futur",
            })} />
          </Field>
        </section>

        <section className="form-section space-y-5">
          <h2 className="form-section-title"><span className="w-9 h-9 rounded-xl bg-accent-50 text-accent-600 flex items-center justify-center"><Wallet className="w-[1.1rem] h-[1.1rem]" /></span>Budget</h2>
          <div>
            <label htmlFor="mission-amount" className="form-label">Montant total<span className="text-accent-600 ml-0.5" aria-hidden="true">*</span></label>
            <div className="relative">
              <input id="mission-amount" type="number" inputMode="decimal" min={10} step="0.01" placeholder="250" className="input-field !text-lg font-semibold pr-12" aria-invalid={errors.amount ? true : undefined} {...register("amount", {
                required: "Indiquez le montant de la mission",
                min: { value: 10, message: "Le montant minimum est de 10 €" },
                max: { value: 1000000, message: "Montant trop élevé" },
              })} />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400">€</span>
            </div>
            {errors.amount && <p role="alert" className="form-error">{errors.amount.message}</p>}
          </div>

          <div className={`grid transition-all duration-500 ${amount > 0 ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-primary-50/50 border border-gray-100 p-5 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">Vous payez</span>
                  <span className="font-semibold tabular-nums">{amount.toLocaleString("fr-FR")} €</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">Commission ProServices ({rate})</span>
                  <span className="font-medium text-gray-500 tabular-nums">−{commission.toLocaleString("fr-FR")} €</span>
                </div>
                <div className="flex justify-between gap-3 border-t border-gray-200 pt-3">
                  <span className="font-semibold text-gray-900">Le professionnel reçoit</span>
                  <span className="font-display font-extrabold text-lg text-emerald-600 tabular-nums">{net.toLocaleString("fr-FR")} €</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-emerald-50/60 border border-emerald-100 p-4 text-sm text-emerald-900">
            <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <p>Paiement sécurisé : le montant reste bloqué jusqu'à ce que vous validiez le travail livré.</p>
          </div>
        </section>

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary sm:flex-1 py-3">Annuler</button>
          <SubmitButton loading={createMutation.isPending} loadingText="Création…" icon={Briefcase} className="btn-primary sm:flex-[2] text-base">
            Envoyer la proposition
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
