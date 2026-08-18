import Link from "next/link";

export const metadata = {
  title: "You are offline",
  // Never index a fallback shell — it has no real content.
  robots: { index: false, follow: false },
};

/**
 * The screen the service worker serves when a navigation fails because the
 * device has no connection.
 *
 * Written for the audience: guardians and students on patchy mobile data, often
 * reading in a second language. Plain words, one clear action, no error codes.
 */
export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "2rem 1.5rem",
        paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
        textAlign: "center",
      }}
    >
      <div
        aria-hidden="true"
        style={{ fontSize: "2.5rem", lineHeight: 1 }}
      >
        📶
      </div>

      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
        You are offline
      </h1>

      <p style={{ margin: 0, maxWidth: "32ch", opacity: 0.75 }}>
        Pravyo needs an internet connection to load this page. Your work is not
        lost — check your connection and try again.
      </p>

      {/* A link, not a button with an onClick: this page is shown precisely
          when the network is unavailable, so it must work with zero JavaScript.
          `Link` is safe here because it prerenders to a plain `<a href>` — if
          no script ever runs it simply performs a normal navigation. */}
      <Link
        href="/"
        style={{
          marginTop: "0.5rem",
          padding: "0.7rem 1.4rem",
          borderRadius: "999px",
          background: "#071833",
          color: "#ffffff",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Try again
      </Link>
    </main>
  );
}
