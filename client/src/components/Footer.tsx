const versionLabel = __GIT_SHA__ ? `v${__APP_VERSION__} (${__GIT_SHA__})` : `v${__APP_VERSION__}`;

/**
 * Rendered on every page (see App.tsx) — a version/build signature is only
 * useful if it's visible regardless of whether the viewer is logged in.
 */
export function Footer() {
  return (
    <footer className="app-footer">
      <span>
        TradeFlow Lite <span className="app-footer-version">{versionLabel}</span>
      </span>
      <span aria-hidden="true">·</span>
      <span>
        © {new Date().getFullYear()}{' '}
        <a
          href="https://www.linkedin.com/in/rabin-avidan-1aab6653/"
          target="_blank"
          rel="noreferrer"
        >
          Rabin Avidan
        </a>
      </span>
    </footer>
  );
}
