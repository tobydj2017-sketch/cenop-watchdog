import worldMap from "@/assets/world-map-bg.jpg";

/**
 * Fondo global: mapa mundi que se desplaza lentamente.
 * Usa una animación CSS con transform (acelerada por GPU) en lugar de
 * recalcular background-position en cada frame con JS: así no consume CPU
 * ni provoca repintados que traben la interfaz.
 */
export default function WorldMapBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0, background: "hsl(var(--background))", contain: "strict" }}
    >
      <div
        className="absolute inset-y-0 left-0 animate-map-pan"
        style={{
          width: "300%",
          backgroundImage: `url(${worldMap})`,
          backgroundRepeat: "repeat-x",
          backgroundSize: "auto 100%",
          opacity: 0.35,
          transform: "translate3d(0,0,0)",
          willChange: "transform",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background/70" />
    </div>
  );
}
