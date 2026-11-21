import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Mail, Lock, User, Phone, MapPin, Globe2, Search, Briefcase, Check, UserPlus, ArrowRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import AuthLayout from "../components/common/AuthLayout";
import { Field, PasswordInput, PasswordStrength, passwordValid, SubmitButton, FormAlert } from "../components/common/Form";
import { COUNTRIES, DEFAULT_COUNTRY } from "../constants/locale";

const ROLES = [
  { value: "CLIENT", title: "Je cherche un pro", text: "Publiez un besoin, comparez, payez en sécurité.", icon: Search },
  { value: "PROFESSIONAL", title: "Je propose mes services", text: "Créez votre profil et recevez des missions.", icon: Briefcase },
];

export default function Register() {
  const { register: doRegister } = useAuth();
  const [params] = useSearchParams();
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    mode: "onTouched",
    defaultValues: { role: params.get("role") === "pro" ? "PROFESSIONAL" : "CLIENT", country: DEFAULT_COUNTRY },
  });
  const role = watch("role");
  const password = watch("password") || "";

  const onSubmit = async ({ confirm_password, terms, ...data }) => {
    setServerError("");
    const payload = { ...data, email: data.email.trim(), first_name: data.first_name.trim(), last_name: data.last_name.trim(), phone: data.phone?.trim() || undefined, city: data.city?.trim() || undefined };
    const res = await doRegister(payload);
    if (!res.success) setServerError(res.error);
  };

  return (
    <AuthLayout
      title="Créer votre compte"
      subtitle="Gratuit, sans engagement, en moins de deux minutes."
      aside={
        <>
          <h2 className="text-3xl font-extrabold leading-tight">Rejoignez une communauté de professionnels de confiance.</h2>
          <p className="text-primary-100 mt-4">Clients et prestataires se retrouvent sur ProServices, en France et dans le monde entier.</p>
        </>
      }
      footer={
        <>Déjà inscrit ?{" "}
          <Link to="/connexion" className="group inline-flex items-center gap-1 font-semibold text-primary-700 hover:text-primary-800">
            Se connecter <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Choix du profil */}
        <fieldset>
          <legend className="form-label">Vous êtes…</legend>
          <div className="grid sm:grid-cols-2 gap-3">
            {ROLES.map(({ value, title, text, icon: Icon }) => {
              const active = role === value;
              return (
                <label key={value} className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200 focus-within:ring-4 focus-within:ring-primary-500/15 ${active ? "border-primary-500 bg-primary-50/70 shadow-glow-primary/20" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
                  <input type="radio" value={value} className="sr-only" {...register("role")} />
                  <span className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${active ? "border-primary-600 bg-primary-600 text-white" : "border-gray-300"}`}>
                    {active && <Check className="w-3 h-3" strokeWidth={3} />}
                  </span>
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors ${active ? "bg-primary-gradient text-white" : "bg-gray-100 text-gray-500"}`}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <p className="font-semibold text-gray-900 text-sm pr-6">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{text}</p>
                </label>
              );
            })}
          </div>
        </fieldset>

        <FormAlert>{serverError}</FormAlert>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Prénom" required icon={User} error={errors.first_name?.message}>
            <input autoComplete="given-name" placeholder="Jean" {...register("first_name", {
              required: "Indiquez votre prénom",
              validate: (v) => v.trim().length >= 2 || "2 caractères minimum",
              maxLength: { value: 100, message: "100 caractères maximum" },
            })} />
          </Field>
          <Field label="Nom" required icon={User} error={errors.last_name?.message}>
            <input autoComplete="family-name" placeholder="Dupont" {...register("last_name", {
              required: "Indiquez votre nom",
              validate: (v) => v.trim().length >= 2 || "2 caractères minimum",
              maxLength: { value: 100, message: "100 caractères maximum" },
            })} />
          </Field>
        </div>

        <Field label="Adresse email" required icon={Mail} error={errors.email?.message}>
          <input type="email" autoComplete="email" inputMode="email" placeholder="vous@exemple.fr" {...register("email", {
            required: "Saisissez votre adresse email",
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Cette adresse email n'est pas valide" },
          })} />
        </Field>

        <Field label="Téléphone" optional icon={Phone} hint="Utile pour que les professionnels vous joignent rapidement." error={errors.phone?.message}>
          <input type="tel" autoComplete="tel" inputMode="tel" placeholder="+33 6 12 34 56 78" {...register("phone", {
            pattern: { value: /^\+?[\d\s.()-]{8,20}$/, message: "Numéro invalide (ex. +33 6 12 34 56 78)" },
          })} />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Pays" icon={Globe2}>
            <select autoComplete="country" {...register("country")}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Ville" optional icon={MapPin}>
            <input autoComplete="address-level2" placeholder="Paris" {...register("city", { maxLength: { value: 100, message: "100 caractères maximum" } })} />
          </Field>
        </div>

        <div>
          <Field label="Mot de passe" required icon={Lock} error={errors.password?.message}>
            <PasswordInput className="input-field" autoComplete="new-password" placeholder="Choisissez un mot de passe" {...register("password", {
              required: "Choisissez un mot de passe",
              validate: passwordValid,
            })} />
          </Field>
          <PasswordStrength value={password} />
        </div>

        <Field label="Confirmer le mot de passe" required icon={Lock} error={errors.confirm_password?.message}>
          <PasswordInput className="input-field" autoComplete="new-password" placeholder="Saisissez-le à nouveau" {...register("confirm_password", {
            required: "Confirmez votre mot de passe",
            validate: (v) => v === watch("password") || "Les deux mots de passe ne correspondent pas",
          })} />
        </Field>

        <div>
          <label className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" className="mt-0.5 flex-shrink-0" aria-invalid={errors.terms ? true : undefined} {...register("terms", { required: "Vous devez accepter les conditions pour créer un compte" })} />
            <span>
              J'accepte les <Link to="/cgu" target="_blank" className="font-medium text-primary-700 underline underline-offset-2">conditions d'utilisation</Link> et
              la <Link to="/confidentialite" target="_blank" className="font-medium text-primary-700 underline underline-offset-2">politique de confidentialité</Link>.
            </span>
          </label>
          {errors.terms && <p role="alert" className="form-error">{errors.terms.message}</p>}
        </div>

        <SubmitButton loading={isSubmitting} loadingText="Création du compte…" icon={UserPlus} className="btn-primary w-full text-base">
          {role === "PROFESSIONAL" ? "Créer mon compte professionnel" : "Créer mon compte"}
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
