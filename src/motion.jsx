import { useEffect, useRef, useState } from "react";
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}
export function usePageMotion(reduced) {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      frame = 0;
      const range = root.scrollHeight - innerHeight;
      root.style.setProperty(
        "--progress",
        range > 0 ? String(scrollY / range) : "0",
      );
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", scroll, { passive: true });
    const observer =
      !reduced && "IntersectionObserver" in window
        ? new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  entry.target.classList.add("revealed");
                  observer.unobserve(entry.target);
                }
              });
            },
            { threshold: 0.08 },
          )
        : null;
    document.querySelectorAll("[data-reveal]").forEach((node) => {
      if (observer) {
        node.classList.add("will-reveal");
        observer.observe(node);
      } else node.classList.add("revealed");
    });
    return () => {
      removeEventListener("scroll", scroll);
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [reduced]);
}
export function trackPointer(event, reduced) {
  if (reduced || event.pointerType !== "mouse") return;
  const node = event.currentTarget,
    rect = node.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width,
    y = (event.clientY - rect.top) / rect.height;
  node.style.setProperty("--rx", `${(y - 0.5) * -3}deg`);
  node.style.setProperty("--ry", `${(x - 0.5) * 3}deg`);
  node.style.setProperty("--mx", `${x * 100}%`);
  node.style.setProperty("--my", `${y * 100}%`);
}
export function resetPointer(event) {
  event.currentTarget.style.setProperty("--rx", "0deg");
  event.currentTarget.style.setProperty("--ry", "0deg");
}
/* 数字计数器：进入视口时从0滚动到目标值 */
export function useCountUp(target, duration = 900, decimals = 2) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(+(eased * target).toFixed(decimals));
          if (p < 1) requestAnimationFrame(tick);
          else setValue(target);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [target, duration, decimals]);
  return [value, ref];
}
