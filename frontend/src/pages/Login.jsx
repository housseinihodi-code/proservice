import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Mail, Lock, LogIn, ArrowRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import AuthLayout from "../components/common/AuthLayout";
import { Field, PasswordInput, SubmitButton, FormAlert } from "../components/common/Form";

const REMEMBER_KEY = "proservices-last-email";
const readRemembered = () => { try { return localStorage.getItem(REMEMBER_KEY) || ""; } catch { return ""; } };

export default function Login() {
  const { login } = useAuth();
  const [serverError, setServerError] = useState("");
  const remembered = readRemembered();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { email: remembered, remember: !!remembered },
  });

  const onSubmit = async ({ email, password, remember }) => {
    setServerError("");
    try { remember ? localStorage.setItem(REMEMBER_KEY, email) : localStorage.removeItem(REMEMBER_KEY); } catch { /* stockage indisponible */ }
    const res = await login(email.trim(), password);
    if (!res.success) setServerError(res.error);
  };

  return (
    <AuthLayout
      title="Bon retour parmi nous"
      subtitle="Connectez-vous pour retrouver vos missions et vos messages."
      aside={
        <>
          <h2 className="text-3xl font-extrabold leading-tight">Vos projets avancent,<br />même quand vous n'êtes pas là.</h2>
          <p className="text-primary-100 mt-4">Suivez vos missions, échangez avec les professionnels et réglez en toute sécurité.</p>
        </>
      }
      footer={
        <>Pas encore de compte ?{" "}
          <Link to="/inscription" className="group inline-flex items-center gap-1 font-semibold text-primary-700 hover:text-primary-800">
            Créer un compte gratuitement <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FormAlert>{serverError}</FormAlert>

        <Field label="Adresse email" icon={Mail} error={errors.email?.message}>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            autoFocus={!remembered}
            placeholder="vous@exemple.fr"
            {...register("email", {
              required: "Saisissez votre adresse email",
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Cette adresse email n'est pas valide" },
            })}
          />
        </Field>

        <Field label="Mot de passe" icon={Lock} error={errors.password?.message}>
          <PasswordInput
            className="input-field"
            autoComplete="current-password"
            autoFocus={!!remembered}
            placeholder="Votre mot de passe"
            {...register("password", { required: "Saisissez votre mot de passe" })}
          />
        </Field>

        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
            <input type="checkbox" {...register("remember")} /> Se souvenir de mon email
          </label>
          <Link to="/contact?sujet=ACCOUNT" className="font-medium text-primary-700 hover:underline">Mot de passe oublié ?</Link>
        </div>

        <SubmitButton loading={isSubmitting} loadingText="Connexion…" icon={LogIn} className="btn-primary w-full text-base">
          Se connecter
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}
