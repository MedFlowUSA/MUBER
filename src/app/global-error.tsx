"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            fontFamily: "system-ui",
            maxWidth: 640,
            margin: "80px auto",
            padding: 24,
            textAlign: "center",
          }}
        >
          <h1>MUBER is temporarily unavailable</h1>
          <p>
            Please try again. No payment or booking status was changed by this
            error.
          </p>
          {error.digest && <p>Reference: {error.digest}</p>}
          <button
            onClick={reset}
            style={{ padding: "12px 20px", fontWeight: 700 }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
