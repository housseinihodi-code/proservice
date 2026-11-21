import { forwardRef, useId, useState, cloneElement, isValidElement } from "react";
import { Eye, EyeOff, AlertCircle, Check, X, Loader2 } from "lucide-react";

/**
 * Champ de formulaire complet : libellé, icône, aide, message d'erreur accessible.
 * L'enfant (input, select, textarea) reçoit automatiquement id, aria-invalid et aria-describedby.
 */
export function Field({ label, error, hint, required, optional, icon: Icon, counter, className = "", children }) {
  const id = useId();
  const msgId = `${id}-msg`;
  const child = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id || id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error || hint ? msgId : undefined,
        className: `${children.props.className || "input-field"} ${Icon ? "pl-11" : ""}`,
      })
    : children;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={children?.props?.id || id} className="form-label">
          {label}
          {required && <span className="text-accent-600 ml-0.5" aria-hidden="true">*</span>}
          {optional && <span className="ml-1.5 text-xs font-normal text-gray-400">(facultatif)</span>}
        </label>
      )}
      <div className="relative group">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-[0.85rem] w-[1.1rem] h-[1.1rem] text-gray-400 transition-colors group-focus-within:text-primary-600" aria-hidden="true" />}
        {child}
      </div>
      <div className="flex items-start justify-between gap-3">
        {error ? (
          <p id={msgId} role="alert" className="form-error"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />{error}</p>
        ) : hint ? (
          <p id={msgId} className="form-hint">{hint}</p>
        ) : <span />}
        {counter && <p className={`form-hint tabular-nums flex-shrink-0 ${counter[0] > counter[1] ? "text-red-600" : ""}`}>{counter[0]} / {counter[1]}</p>}
      </div>
    </div>
  );
}

/** Mot de passe avec bouton afficher / masquer. */
export const PasswordInput = forwardRef(function PasswordInput({ className = "", ...props }, ref) {
  const [show, setShow] = useState(false);
  return (
    <>
      <input ref={ref} type={show ? "text" : "password"} className={`${className} pr-11`} {...props} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </>
  );
});

/** Mêmes règles que le serveur (schemas/user.py). */
export const PASSWORD_RULES = [
  { label: "8 caractères minimum", test: (v) => v.length >= 8 },
  { label: "Une majuscule", test: (v) => /[A-Z]/.test(v) },
  { label: "Un chiffre", test: (v) => /\d/.test(v) },
];
export const passwordValid = (v = "") => PASSWORD_RULES.every((r) => r.test(v)) || "Le mot de passe ne respecte pas les règles ci-dessous";

/** Jauge de robustesse et liste des règles, mises à jour pendant la saisie. */
export function PasswordStrength({ value = "" }) {
  const passed = PASSWORD_RULES.filter((r) => r.test(value)).length + (value.length >= 12 && /[^A-Za-z0-9]/.test(value) ? 1 : 0);
  const levels = [
    { label: "Trop faible", color: "bg-red-500", text: "text-red-600" },
    { label: "Faible", color: "bg-orange-500", text: "text-orange-600" },
    { label: "Moyen", color: "bg-amber-500", text: "text-amber-600" },
    { label: "Bon", color: "bg-emerald-500", text: "text-emerald-600" },
    { label: "Excellent", color: "bg-emerald-600", text: "text-emerald-700" },
  ];
  const lvl = levels[value ? passed : 0];
  return (
    <div className="mt-2.5 space-y-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex-1 grid grid-cols-4 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-1.5 rounded-full transition-colors duration-300 ${value && i < passed ? lvl.color : "bg-gray-200"}`} />
          ))}
        </div>
        {value && <span className={`text-xs font-semibold w-20 text-right ${lvl.text}`}>{lvl.label}</span>}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(value);
          return (
            <li key={r.label} className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? "text-emerald-600" : "text-gray-500"}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${ok ? "bg-emerald-100" : "bg-gray-100"}`}>
                {ok ? <Check className="w-3 h-3" strokeWidth={3} /> : <X className="w-2.5 h-2.5" strokeWidth={3} />}
              </span>
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Bouton d'envoi avec indicateur de chargement (garde sa largeur). */
export function SubmitButton({ loading, loadingText = "Envoi…", icon: Icon, className = "btn-primary", children, ...props }) {
  return (
    <button type="submit" disabled={loading || props.disabled} aria-busy={loading || undefined} className={`${className} py-3`} {...props}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
      {loading ? loadingText : children}
    </button>
  );
}

/** Bandeau d'erreur globale (ex. identifiants incorrects). */
export function FormAlert({ children, tone = "error" }) {
  if (!children) return null;
  const styles = tone === "error"
    ? "bg-red-50 border-red-200 text-red-800"
    : "bg-emerald-50 border-emerald-200 text-emerald-800";
  return (
    <div role="alert" className={`animate-fade-in flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${styles}`}>
      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
