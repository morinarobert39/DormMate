"use client";

/**
 * Last-resort boundary for errors thrown in the root layout itself, where `error.tsx` cannot
 * render because the layout that wraps it is the thing that failed. It must therefore supply its
 * own <html> and <body>, and cannot rely on any shared component or on the stylesheet having
 * loaded — hence the inline styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="sq">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f4f6fa",
          color: "#101a2b",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem",
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            width: "100%",
            backgroundColor: "#fff",
            border: "1px solid #dde3ed",
            borderRadius: "6px",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            Ndodhi një gabim i papritur
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#3b4d69", margin: "0 0 1rem" }}>
            Aplikacioni nuk mund të ngarkohej. Ju lutemi provoni përsëri.
          </p>
          {error.digest ? (
            <p
              style={{
                fontSize: "0.75rem",
                color: "#8493a9",
                fontFamily: "ui-monospace, monospace",
                margin: "0 0 1rem",
              }}
            >
              Kodi i gabimit: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              backgroundColor: "#1b4db1",
              color: "#fff",
              border: 0,
              borderRadius: "6px",
              padding: "0.625rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Provo përsëri
          </button>
        </div>
      </body>
    </html>
  );
}
