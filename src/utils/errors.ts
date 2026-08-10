/**
 * Errors crossing the Supabase client (and some RN bridges) don't always
 * pass `instanceof Error` even when they carry a `.message` — falling back
 * straight to `String(err)` on those turns into a useless "[object Object]"
 * alert. Check for a `.message` field before giving up.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return String(err);
}
