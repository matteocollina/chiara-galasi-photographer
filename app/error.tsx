"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container text-center site-section">
      <h2 className="text-white">Galleria temporaneamente non disponibile</h2>
      <p>Riprova tra qualche istante.</p>
      <button className="btn btn-outline-white" onClick={reset}>
        Riprova
      </button>
    </div>
  );
}
