/**
 * Shared Edge Function Utilities
 * 
 * Common helpers for API key validation and JSON responses.
 * Import from any edge function: import { requireApiKey, jsonOk, jsonError } from "../_shared/edgeUtils.ts";
 */

import { buildCorsHeaders } from "./cors.ts";

// Re-export for backward compatibility — functions that don't pass a Request
// get the first allowed origin (safe default).
export const corsHeaders = buildCorsHeaders();

/**
 * Returns CORS headers validated against the request Origin.
 * Prefer this over the static corsHeaders when you have a Request object.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  return buildCorsHeaders(req);
}

/**
 * Creates a JSON response with CORS headers
 */
function createJsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Returns a successful JSON response: { ok: true, data: ... }
 */
export function jsonOk(data: unknown, init?: ResponseInit): Response {
  const status = init?.status ?? 200;
  return new Response(JSON.stringify({ ok: true, data }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...init?.headers },
  });
}

/**
 * Returns an error JSON response: { ok: false, errorCode, message, ...extra }
 */
export function jsonError(
  errorCode: string,
  message: string,
  status = 400,
  extra?: Record<string, unknown>
): Response {
  return createJsonResponse({ ok: false, errorCode, message, ...extra }, status);
}

/**
 * Validates the x-edge-api-key header against EDGE_FUNCTION_API_KEY env var.
 * 
 * Usage:
 *   const unauthorized = requireApiKey(req);
 *   if (unauthorized) return unauthorized;
 * 
 * @returns Response with 401 if unauthorized, null if valid
 */
export function requireApiKey(req: Request): Response | null {
  const apiKey = Deno.env.get("EDGE_FUNCTION_API_KEY");
  const providedKey = req.headers.get("x-edge-api-key");

  if (!apiKey) {
    console.error("EDGE_FUNCTION_API_KEY not configured in environment");
    return jsonError("CONFIG_ERROR", "Server configuration incomplete: API key not set", 500);
  }

  if (!providedKey || providedKey !== apiKey) {
    return jsonError("UNAUTHORIZED", "Missing or invalid API key", 401);
  }

  return null;
}

/**
 * Handles CORS preflight requests
 * 
 * Usage:
 *   if (req.method === "OPTIONS") return handleCors();
 */
export function handleCors(): Response {
  return new Response(null, { headers: corsHeaders });
}

/**
 * Validates UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Validates ISO date format (YYYY-MM-DD)
 */
export function isValidISODate(str: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(str)) return false;
  const date = new Date(str);
  return !isNaN(date.getTime());
}
