"use client";
import { useEffect } from "react";

export function usePageMotion(pathname: string, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const main = document.getElementById("main-content"),
      header = document.querySelector<HTMLElement>(".topbar");
    if (!main || !header) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)"),
      animations = new Set<Animation>(),
      observed = new WeakSet<Element>();
    let frame = 0,
      disposed = false;
    const update = () => {
      frame = 0;
      const range = document.documentElement.scrollHeight - innerHeight;
      header.style.setProperty(
        "--scroll-progress",
        String(range > 0 ? Math.max(0, Math.min(1, scrollY / range)) : 0),
      );
      header.dataset.scrolled = String(scrollY > 12);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Only source inventory and newly returned decision rows unfold. The default
    // render stays visible, including when observers or animation APIs are absent.
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                observer?.unobserve(entry.target);
                if (
                  preference.matches ||
                  entry.target.contains(document.activeElement) ||
                  !entry.target.animate
                )
                  continue;
                const animation = entry.target.animate(
                  [
                    { clipPath: "inset(0 0 8px 0 round 12px)", opacity: 0.86 },
                    { clipPath: "inset(0 0 0px 0 round 12px)", opacity: 1 },
                  ],
                  { duration: 360, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
                );
                animations.add(animation);
                animation.finished
                  .catch(() => {})
                  .finally(() => animations.delete(animation));
              }
            },
            { threshold: 0.08, rootMargin: "0px 0px -16px 0px" },
          )
        : null;
    const discover = () => {
      if (disposed || preference.matches) return;
      main.querySelectorAll("[data-reveal]").forEach((node) => {
        if (!observed.has(node)) {
          observed.add(node);
          observer?.observe(node);
        }
      });
      schedule();
    };
    const reduce = () => {
      if (preference.matches) {
        animations.forEach((animation) => animation.cancel());
        observer?.disconnect();
      } else discover();
    };
    const mutations = new MutationObserver(discover),
      resize =
        typeof ResizeObserver !== "undefined"
          ? new ResizeObserver(schedule)
          : null;
    mutations.observe(main, { childList: true, subtree: true });
    resize?.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    preference.addEventListener("change", reduce);
    discover();
    update();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      animations.forEach((animation) => animation.cancel());
      observer?.disconnect();
      mutations.disconnect();
      resize?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      preference.removeEventListener("change", reduce);
    };
  }, [pathname, ready]);
}
