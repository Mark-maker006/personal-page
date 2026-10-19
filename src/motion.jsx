import { useEffect, useState } from "react";
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
      root.style.setProperty(
        "--parallax",
        reduced ? "0px" : `${Math.min(scrollY * 0.055, 28)}px`,
      );
    };
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    addEventListener("scroll", scroll, { passive: true });
    // 只在有观察器且允许动态时隐藏，正文保留可读降级方案。
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
// 鼠标反馈限制为小幅度；触摸屏与减少动态模式使用静态布局。
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
export function ParticleField({ reduced }) {
  if (reduced) return null;
  return (
    <div className="particle-field" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <i
          key={i}
          style={{
            "--i": i,
            left: `${(i * 37 + 7) % 100}%`,
            top: `${(i * 19 + 5) % 100}%`,
          }}
        />
      ))}
    </div>
  );
}
