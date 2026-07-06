/**
 * Runs before React hydrates — syncs PWA viewport classes and guarantees splash dismiss
 * even if the client bundle fails to load (common iOS standalone edge cases).
 */
export function SplashBootstrapScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function () {
  var root = document.documentElement;
  var mobile = window.matchMedia("(max-width: 1023px)").matches;
  var standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator && window.navigator.standalone === true);

  if (mobile) root.classList.add("mobile-viewport");
  if (standalone) root.classList.add("pwa-standalone");
  if (mobile || standalone) root.dataset.mobileApp = "true";

  if (!mobile && !standalone) {
    root.classList.add("splash-dismissed");
    return;
  }

  var key = "potentially-splash-seen";
  try {
    if (sessionStorage.getItem(key)) {
      root.classList.add("splash-dismissed");
      return;
    }
  } catch (e) {}

  window.setTimeout(function () {
    root.classList.add("splash-dismissed");
    try {
      sessionStorage.setItem(key, "1");
    } catch (e) {}
  }, 2400);
})();
        `.trim(),
      }}
    />
  );
}
