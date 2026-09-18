/**
 * Minimal fixed-window rate limiter. In-memory per-process state — on Vercel's
 * serverless runtime this limits per warm instance, which is the intended
 * "basic protection" here: it stops a leaked session or a runaway client from
 * hammering the paid-per-call LLM endpoints into a quota/cost problem. The
 * limiter runs before any LLM call, so an attacker's 21st request in a window
 * never reaches Gemini/Groq. Swap the backend for Upstash (free tier) if a
 * shared, multi-instance budget is ever needed.
 */

export const RATE_LIMITS = {
  // /api/ask — one request = one embedding + (usually) one Groq completion.
  ask: { limit: 20, windowMs: 60_000 },
  // Uploading a file (writes to storage) then running extraction (Gemini).
  upload: { limit: 15, windowMs: 60_000 },
  // Gemini vision / PDF extraction — the most expensive call per request.
  extract: { limit: 10, windowMs: 60_000 },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

interface WindowState {
  resetAt: number;
  count: number;
}

const windows = new Map<string, WindowState>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(
  name: RateLimitName,
  key: string,
  now: number = Date.now(),
): RateLimitResult {
  const config = RATE_LIMITS[name];
  const entry = `${name}:${key}`;

  let state = windows.get(entry);
  if (!state || now >= state.resetAt) {
    state = { resetAt: now + config.windowMs, count: 0 };
    // Oldest entries are overwritten or pruned lazily by the reset check, so
    // the map never grows without bound per active user.
    windows.set(entry, state);
  }

  state.count += 1;
  if (state.count > config.limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)),
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}