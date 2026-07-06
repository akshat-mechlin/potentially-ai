import { BrandMark } from "@/components/brand-mark";

/** Instant paint splash — visible before React hydrates on mobile / PWA cold start. */
export function SplashStatic() {
  return (
    <div id="potentially-splash" className="app-splash-static" aria-hidden="true">
      <div className="app-splash-static-glow" />
      <div className="app-splash-static-inner">
        <div className="app-splash-logo-wrap">
          <BrandMark className="app-splash-logo" variant="tile" />
        </div>
        <p className="app-splash-title">Potentially</p>
        <p className="app-splash-tagline">Relationship intelligence</p>
        <div className="app-splash-loader" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
