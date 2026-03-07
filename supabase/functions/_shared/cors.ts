/**
 * Shared CORS resolver for all Edge Functions.
 *
 * Reads the ALLOWED_ORIGINS env var (comma-separated list of origins).
 * Validates the incoming request's Origin header against the allowlist
 * and echoes back only the matching origin (per the CORS spec).
 *
 * Usage:
 *   import { buildCorsHeaders } from "../_shared/cors.ts";
 *   const corsHeaders = buildCorsHeaders(req);
 *
 * When ALLOWED_ORIGINS is unset, falls back to "*" for Lovable compatibility.
 * When migrating to Azure, set ALLOWED_ORIGINS to your production domain(s).
 */

/**
 * Resolves a single valid Access-Control-Allow-Origin value
 * based on the request's Origin header and the ALLOWED_ORIGINS env var.
 */
export function resolveOrigin(requestOrigin: string | null): string {
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");

  // No env var set — fallback to wildcard (Lovable compatibility)
  if (!envOrigins) return "*";

  const allowedList = envOrigins.split(",").map((o) => o.trim()).filter(Boolean);

  // If the allowlist explicitly includes "*", allow everything
  if (allowedList.includes("*")) return "*";

  // If the request origin is in the allowlist, echo it back
  if (requestOrigin && allowedList.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Origin not in allowlist — return the first allowed origin
  // (browsers will block the request, which is the desired behavior)
  return allowedList[0] || "*";
}

/**
 * Builds a complete CORS headers object for an edge function response.
 * Pass the incoming Request to get request-aware Origin validation.
 */
export function buildCorsHeaders(req?: Request): Record<string, string> {
  const requestOrigin = req?.headers.get("origin") || null;
  return {
    "Access-Control-Allow-Origin": resolveOrigin(requestOrigin),
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-edge-api-key, x-n8n-endpoint",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}
