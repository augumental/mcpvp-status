// Subtle animated ambient background: drifting crimson gradients, a masked grid,
// and scanlines. Purely decorative; kept understated and GPU-friendly.
export function AnimatedBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Drifting crimson ambient blooms */}
      <div className="animate-drift absolute -top-1/3 left-1/4 h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,oklch(0.55_0.22_22/25%),transparent_60%)] blur-3xl" />
      <div className="animate-drift-alt absolute -bottom-1/4 right-1/5 h-[60vh] w-[60vh] rounded-full bg-[radial-gradient(circle,oklch(0.45_0.2_18/20%),transparent_60%)] blur-3xl" />
      <div className="animate-drift absolute top-1/2 left-1/2 h-[40vh] w-[40vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,oklch(0.6_0.24_25/12%),transparent_65%)] blur-3xl" />

      {/* Masked grid lines */}
      <div className="grid-overlay absolute inset-0" />

      {/* Vignette to deepen edges */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_100%_at_50%_0%,transparent_40%,oklch(0.05_0.006_15/90%)_100%)]" />
    </div>
  )
}
