import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Mail, Phone, MapPin, Send, CheckCircle2, User, MessageSquare, Clock, HelpCircle } from "lucide-react";
import { contactAPI } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { apiError, CONTACT_SUBJECTS } from "../constants/locale";
import { Field, SubmitButton, FormAlert } from "../components/common/Form";
import { Reveal } from "../components/common/Motion";

const MAX = 3000;
const INFOS = [
  { icon: Mail, label: "Email", value: "contact@proservices.fr", href: "mailto:contact@proservices.fr" },
  { icon: Phone, label: "Téléphone", value: "+33 1 84 80 00 00", href: "tel:+33184800000" },
  { icon: MapPin, label: "Adresse", value: "Paris, France" },
  { icon: Clock, label: "Délai de réponse", value: "Sous 48 h ouvrées" },
];

export default function Contact() {
  const { user } = useAuthStore();
  const [params] = useSearchParams();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");
  const initialSubject = CONTACT_SUBJECTS[params.get("sujet")] ? params.get("sujet") : "QUESTION";
  const defaults = { name: user ? `${user.first_name} ${user.last_name}` : "", email: user?.email || "", subject: initialSubject, message: "" };
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({ mode: "onTouched", defaultValues: defaults });
  const message = watch("message") || "";

  const onSubmit = async (data) => {
    setServerError("");
    try {
      await contactAPI.send({ ...data, name: data.name.trim(), email: data.email.trim(), message: data.message.trim() });
      setSent(true);
      reset(defaults);
    } catch (err) {
      setServerError(apiError(err, "L'envoi a échoué, réessayez dans un instant"));
    }
  };

  return (
    <div>
      <section className="relative overflow-hidden bg-hero-gradient text-white py-16 md:py-20 px-4 text-center isolate">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)] -z-10" />
        <div className="absolute -top-24 left-1/4 w-80 h-80 rounded-full bg-accent-500/25 blur-3xl animate-blob -z-10" />
        <p className="eyebrow text-accent-400 mb-3 justify-center"><span className="w-6 h-px bg-accent-400" />Support</p>
        <h1 className="text-3xl md:text-5xl font-extrabold mb-4">Contactez-nous</h1>
        <p className="text-primary-100 text-lg max-w-xl mx-auto">Une question, un problème ? Notre équipe vous répond personnellement.</p>
      </section>

      <section className="relative -mt-10 pb-20 px-4 max-w-6xl mx-auto grid lg:grid-cols-[.8fr_1.2fr] gap-6 lg:gap-8">
        <Reveal variant="left" className="space-y-3 order-2 lg:order-1 min-w-0">
          {INFOS.map(({ icon: Icon, label, value, href }) => {
            const body = (
              <>
                <span className="w-11 h-11 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-primary-600 group-hover:text-white"><Icon className="w-5 h-5" /></span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
                  <p className="font-semibold text-gray-900 truncate">{value}</p>
                </div>
              </>
            );
            return href
              ? <a key={label} href={href} className="group card lift p-4 flex items-center gap-4">{body}</a>
              : <div key={label} className="group card p-4 flex items-center gap-4">{body}</div>;
          })}
          <Link to="/faq" className="group flex items-center gap-4 rounded-2xl border border-dashed border-primary-200 bg-primary-50/50 p-4 hover:bg-primary-50 transition-colors">
            <HelpCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
            <p className="text-sm text-gray-700">La réponse est peut-être déjà dans notre <span className="font-semibold text-primary-700 group-hover:underline">centre d'aide</span>.</p>
          </Link>
        </Reveal>

        <Reveal variant="right" className="order-1 lg:order-2 min-w-0">
          {sent ? (
            <div className="form-section text-center flex flex-col items-center justify-center min-h-[28rem]">
              <span className="relative w-16 h-16 mb-5">
                <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-pulse-ring" />
                <span className="relative w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center animate-scale-in"><CheckCircle2 className="w-8 h-8" /></span>
              </span>
              <h2 className="text-2xl text-gray-900 mb-2">Message bien reçu</h2>
              <p className="text-gray-600 mb-7 max-w-sm">Merci ! Notre équipe vous répondra par email, en général sous 48 heures ouvrées.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setSent(false)} className="btn-secondary">Envoyer un autre message</button>
                <Link to="/faq" className="btn-primary">Consulter la FAQ</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="form-section space-y-5">
              <div>
                <h2 className="text-xl text-gray-900">Écrivez-nous</h2>
                <p className="text-sm text-gray-500 mt-1">Les champs marqués d'un <span className="text-accent-600">*</span> sont obligatoires.</p>
              </div>
              <FormAlert>{serverError}</FormAlert>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nom complet" required icon={User} error={errors.name?.message}>
                  <input autoComplete="name" placeholder="Jean Dupont" {...register("name", {
                    required: "Indiquez votre nom",
                    validate: (v) => v.trim().length >= 2 || "2 caractères minimum",
                    maxLength: { value: 100, message: "100 caractères maximum" },
                  })} />
                </Field>
                <Field label="Email" required icon={Mail} error={errors.email?.message}>
                  <input type="email" autoComplete="email" inputMode="email" placeholder="vous@exemple.fr" {...register("email", {
                    required: "Indiquez votre email pour que nous puissions vous répondre",
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Cette adresse email n'est pas valide" },
                  })} />
                </Field>
              </div>
              <Field label="Sujet" icon={HelpCircle}>
                <select {...register("subject")}>
                  {Object.entries(CONTACT_SUBJECTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Message" required icon={MessageSquare} error={errors.message?.message} counter={[message.length, MAX]}>
                <textarea rows={6} maxLength={MAX} placeholder="Décrivez votre demande le plus précisément possible…" {...register("message", {
                  required: "Écrivez votre message",
                  validate: (v) => v.trim().length >= 10 || "Votre message doit faire au moins 10 caractères",
                })} />
              </Field>
              <SubmitButton loading={isSubmitting} loadingText="Envoi en cours…" icon={Send} className="btn-primary w-full text-base">
                Envoyer le message
              </SubmitButton>
              <p className="text-xs text-gray-400 text-center">Vos informations servent uniquement à traiter votre demande. <Link to="/confidentialite" className="underline">En savoir plus</Link></p>
            </form>
          )}
        </Reveal>
      </section>
    </div>
  );
}
