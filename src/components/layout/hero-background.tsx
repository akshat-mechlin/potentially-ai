export function HeroBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/hero-option-1-abstract-network.png)" }}
      />
      {/* Cream wash on the left for readable copy; network art stays visible on the right */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, var(--background) 0%, color-mix(in oklch, var(--background) 90%, transparent) 40%, color-mix(in oklch, var(--background) 45%, transparent) 55%, transparent 75%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, color-mix(in oklch, var(--background) 50%, transparent) 0%, transparent 30%)",
        }}
      />
    </div>
  );
}
