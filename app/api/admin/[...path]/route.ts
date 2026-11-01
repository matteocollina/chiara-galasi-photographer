import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { login, logout, requireSession } from "@/lib/server/auth";
import { readCatalog, mutateCatalog } from "@/lib/server/catalog";
import {
  cleanupCount,
  completeUpload,
  runCleanup,
  signUpload,
} from "@/lib/server/uploads";
import { assertOrigin, HttpError, jsonBody } from "@/lib/server/http";
import {
  completeSchema,
  loginSchema,
  mutationSchema,
  signSchema,
} from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};
function ok(data: unknown = { ok: true }) {
  return NextResponse.json(data, { headers });
}
function invalidate() {
  revalidateTag("portfolio", { expire: 0 });
  revalidatePath("/", "layout");
}
async function handle(request: Request, path: string[], method: string) {
  try {
    const endpoint = path.join("/");
    if (method === "POST") assertOrigin(request);
    if (method === "POST" && endpoint === "login") {
      const input = loginSchema.parse(await jsonBody(request));
      await login(request, input.username, input.password);
      return ok();
    }
    if (method === "POST" && endpoint === "logout") {
      await logout();
      return ok();
    }
    const session = await requireSession();
    if (method === "GET" && endpoint === "state")
      return ok({
        categories: await readCatalog(),
        cleanupCount: await cleanupCount(),
      });
    if (method === "POST" && endpoint === "mutate") {
      const input = mutationSchema.parse(await jsonBody(request));
      await mutateCatalog(input);
      invalidate();
      if (input.action === "deletePhoto" || input.action === "retryCleanup")
        await runCleanup();
      return ok();
    }
    if (method === "POST" && endpoint === "uploads/sign") {
      const input = signSchema.parse(await jsonBody(request));
      return ok(await signUpload(input.categoryId, session));
    }
    if (method === "POST" && endpoint === "uploads/complete") {
      const input = completeSchema.parse(await jsonBody(request));
      await completeUpload(input.uploadId, input.alt, session);
      invalidate();
      return ok();
    }
    throw new HttpError(404, "Operazione non trovata.");
  } catch (error) {
    if (error instanceof HttpError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status, headers },
      );
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Dati non validi." },
        { status: 400, headers },
      );
    // Never serialize SDK/database errors: they can contain connection details.
    console.error("Admin request failed", {
      path: path.join("/"),
      type: error instanceof Error ? error.name : "ServiceError",
    });
    return NextResponse.json(
      {
        error:
          "Operazione non riuscita. Verifica la configurazione e le quote dei servizi, poi riprova.",
      },
      { status: 503, headers },
    );
  }
}
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return handle(request, (await context.params).path, "GET");
}
export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return handle(request, (await context.params).path, "POST");
}
