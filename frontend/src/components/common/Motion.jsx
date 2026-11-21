import { useEffect, useRef, useState } from "react";

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Déclenche `visible` la première fois que l'élément entre dans l'écran. */
export function useInView(options = { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion() || !("IntersectionObserver" in window)) { setVisible(true); return; }
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, options);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/**
 * Fait apparaître son contenu en douceur au défilement.
 * variant : "up" (défaut), "left", "right", "zoom" · delay en ms (pour décaler une liste)
 */
export function Reveal({ as: Tag = "div", variant = "up", delay = 0, className = "", children, ...rest }) {
  const [ref, visible] = useInView();
  return (
    <Tag
      ref={ref}
      data-variant={variant}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`}
      style={{ "--reveal-delay": `${delay}ms`, ...(rest.style || {}) }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Compteur animé de 0 jusqu'à `value`, lancé quand il devient visible. */
export function CountUp({ value = 0, duration = 1600, suffix = "", className = "" }) {
  const [ref, visible] = useInView({ threshold: 0.4 });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!visible) return;
    if (reducedMotion()) { setN(value); return; }
    let raf, start;
    const tick = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, value, duration]);
  return <span ref={ref} className={className}>{n.toLocaleString("fr-FR")}{suffix}</span>;
}

/** Vrai dès que la page a défilé de plus de `offset` pixels. */
export function useScrolled(offset = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > offset);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [offset]);
  return scrolled;
}

/** Bandeau qui défile en continu (le contenu est doublé pour boucler sans saut). */
export function Marquee({ children, className = "", reverse = false }) {
  return (
    <div className={`overflow-hidden mask-fade-x ${className}`}>
      <div className={`flex w-max gap-3 animate-marquee hover:[animation-play-state:paused] ${reverse ? "[animation-direction:reverse]" : ""}`}>
        <div className="flex gap-3">{children}</div>
        <div className="flex gap-3" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}
