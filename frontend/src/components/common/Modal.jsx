import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/** Fenêtre modale : panneau qui monte du bas sur mobile, carte centrée sur grand écran. */
export default function Modal({ isOpen, onClose, title, children, size = "md" }) {
  const titleId = useId();
  const panel = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const lastFocus = document.activeElement;
    // Place le focus dans la fenêtre (premier champ s'il y en a un).
    requestAnimationFrame(() => {
      const first = panel.current?.querySelector("input:not([type=hidden]), select, textarea, button:not([data-close])");
      (first || panel.current)?.focus();
    });
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      lastFocus?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" }[size] || "sm:max-w-lg";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-primary-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative bg-white w-full ${sizeClass} max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl shadow-[0_30px_80px_-20px_rgba(0,0,0,.45)] animate-sheet-up sm:animate-scale-in outline-none`}
      >
        <span className="sm:hidden mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-gray-200" aria-hidden="true" />
        <div className="flex items-center justify-between gap-4 px-5 sm:px-7 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 id={titleId} className="font-display font-bold text-gray-900 text-lg leading-snug">{title}</h2>
          <button data-close onClick={onClose} aria-label="Fermer" className="p-2 -mr-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 sm:px-7 py-5 overflow-y-auto overscroll-contain pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}
