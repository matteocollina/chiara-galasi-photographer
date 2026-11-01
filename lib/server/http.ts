import "server-only";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new HttpError(403, "Origine della richiesta non valida.");
}
export async function jsonBody(request: Request) {
  const raw = await request.text();
  if (raw.length > 32_000) throw new HttpError(413, "Richiesta troppo grande.");
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Richiesta non valida.");
  }
}
