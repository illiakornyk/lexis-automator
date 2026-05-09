"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

// Replaces the entire document when the root layout itself crashes,
// so <html> and <body> must be rendered here directly.
export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "sans-serif", backgroundColor: "#f8fafc" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div style={{ maxWidth: 400, textAlign: "center" }}>
            <div
              style={{
                display: "inline-flex",
                borderRadius: "9999px",
                backgroundColor: "#fee2e2",
                padding: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <AlertTriangle style={{ width: 32, height: 32, color: "#ef4444" }} />
            </div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#0f172a", marginBottom: "0.5rem" }}>
              Critical error
            </h1>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              {error.message || "The application encountered an unexpected error."}
            </p>
            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                border: "1px solid #cbd5e1",
                borderRadius: "0.375rem",
                backgroundColor: "#fff",
                cursor: "pointer",
                fontSize: "0.875rem",
                color: "#334155",
              }}
            >
              <RotateCcw style={{ width: 14, height: 14 }} />
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
