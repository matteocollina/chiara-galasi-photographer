"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function LoginForm({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="admin-card admin-login"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError("");
        const data = new FormData(event.currentTarget);
        try {
          const result = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: data.get("username"),
              password: data.get("password"),
            }),
          });
          const body = await result.json();
          if (!result.ok) throw new Error(body.error);
          router.refresh();
        } catch (error) {
          setError(
            error instanceof Error ? error.message : "Accesso non riuscito.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Accedi al portfolio</h2>
      <p>Area riservata per gestire categorie e fotografie.</p>
      <label>
        Nome utente
        <input
          name="username"
          autoComplete="username"
          required
          maxLength={100}
          disabled={disabled || busy}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={300}
          disabled={disabled || busy}
        />
      </label>
      {error && (
        <p role="alert" className="admin-error">
          {error}
        </p>
      )}
      <button disabled={disabled || busy}>
        {busy ? "Accesso…" : "Accedi"}
      </button>
    </form>
  );
}
