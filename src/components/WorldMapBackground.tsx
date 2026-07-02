import { useEffect, useRef } from "react";
import worldMap from "@/assets/world-map-bg.jpg";

/**
 * Fondo global: mapa mundi equirectangular que se desplaza (rota horizontalmente)
 * suavemente según el scroll y el movimiento del mouse del usuario.
 * La imagen se repite en X para simular una rotación infinita.
 */
export default function WorldMapBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => {
      target.current.x = window.scrollY * 0.35;
    };
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 60;
      const ny = (e.clientY / window.innerHeight - 0.5) * 25;
      target.current.x = window.scrollY * 0.35 + nx;
      target.current.y = ny;
    };

    let auto = 0;
    const tick = () => {
      auto += 0.05; // rotación automática lenta
      const tx = target.current.x + auto;
      const ty = target.current.y;
      current.current.x += (tx - current.current.x) * 0.06;
      current.current.y += (ty - current.current.y) * 0.06;
      if (ref.current) {
        ref.current.style.backgroundPosition = `${-current.current.x}px ${current.current.y}px`;
      }
      raf.current = requestAnimationFrame(tick);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    raf.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-background"
    >
      <div
        ref={ref}
        className="absolute inset-0 opacity-[0.18] will-change-[background-position]"
        style={{
          backgroundImage: `url(${worldMap})`,
          backgroundRepeat: "repeat-x",
          backgroundSize: "auto 100vh",
        }}
      />
      {/* Viñeta para integrar con el tema */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/80" />
    </div>
  );
}
