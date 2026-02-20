

# Make Contacts Table "Draft Email" Use the 2026 Pipeline

## Problem

The "Draft Email" button in the Contacts table actions menu currently posts to the **legacy** `post_to_n8n` edge function, while the Email Builder uses the newer `post_to_n8n_2026` endpoint. The payloads are built identically (both use `buildEnhancedDraftPayload`), but the final HTTP call goes to different webhooks.

## Fix

A single change in `src/hooks/useContactDraftGenerator.ts`:

**Change the endpoint** from `post_to_n8n` to `post_to_n8n_2026` (line ~373), and update the response handling to match the 2026 format.

### What Changes

| Area | Current | After |
|------|---------|-------|
| Endpoint | `/functions/v1/post_to_n8n` | `/functions/v1/post_to_n8n_2026` |
| Response handling | Streams SSE text | Parses JSON with `draft` object |
| Success message | "Draft for X has been sent to Outlook" | Same message, unchanged |

### Technical Detail

In `src/hooks/useContactDraftGenerator.ts`, the fetch call at line 372-382 will change from:

```text
fetch(`${VITE_SUPABASE_URL}/functions/v1/post_to_n8n`, {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({ payload }),
})
```

to:

```text
fetch(`${VITE_SUPABASE_URL}/functions/v1/post_to_n8n_2026`, {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({ payload }),
})
```

The response handling will also be updated to parse the JSON response (checking `responseData.draft`) instead of treating it as a streaming response, matching the Email Builder's pattern exactly.

### No Other Changes Needed

- The payload construction already uses the same `buildEnhancedDraftPayload` function
- The `post_to_n8n_2026` edge function already handles the payload transformation to the 2026 Pipeline webhook format
- The same n8n webhook processes the request and creates the Outlook draft

