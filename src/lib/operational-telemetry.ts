import { requestId } from "./request-id";

type Outcome = "success" | "rejected" | "failed";

export function databaseErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error))
    return "unknown";
  const code = String(error.code);
  return /^[A-Za-z0-9_.-]{1,32}$/.test(code) ? code : "unknown";
}

export function logApiEvent({
  request,
  event,
  outcome,
  status,
  startedAt,
  error,
}: {
  request: Request;
  event: string;
  outcome: Outcome;
  status: number;
  startedAt: number;
  error?: unknown;
}) {
  const record = {
    timestamp: new Date().toISOString(),
    event: event.replace(/[^a-z0-9_.-]/gi, "_").slice(0, 80),
    requestId: requestId(request.headers.get("x-request-id")),
    outcome,
    status,
    durationMs: Math.max(0, Date.now() - startedAt),
    ...(error ? { databaseErrorCode: databaseErrorCode(error) } : {}),
  };
  const serialized = JSON.stringify(record);
  if (outcome === "failed") console.error(serialized);
  else if (outcome === "rejected") console.warn(serialized);
  else console.info(serialized);
}
