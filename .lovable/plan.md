

# Plan: Add 2026 Pipeline Draft Mode with New Webhook

## Summary

Add a new "Draft 2026 Pipeline" button as the primary draft generation action, which posts to the new `https://inverisllc.app.n8n.cloud/webhook/2026 Pipeline` webhook. The existing legacy draft flow is demoted to a secondary option in a dropdown. The new webhook receives a payload shaped to match what the `email_pipeline_contacts_v` view provides, which is what the Auto Email Builder n8n workflow already consumes.

---

## Architecture Overview

```text
Current Flow:
  Email Builder UI --> buildEnhancedDraftPayload() --> post_to_n8n edge function --> n8n "Email-Builder" webhook

New Flow (primary):
  Email Builder UI --> build2026PipelinePayload() --> post_to_n8n_2026 edge function --> n8n "2026 Pipeline" webhook

Legacy Flow (dropdown option):
  Same as current flow, unchanged
```

---

## Part 1: New Edge Function - `post_to_n8n_2026`

Create a new edge function that:
1. Authenticates the user (same pattern as `post_to_n8n`)
2. Receives the `EnhancedDraftPayload` from the client
3. Transforms it into the `email_pipeline_contacts_v` format that the Auto Email Builder expects
4. POSTs to `https://inverisllc.app.n8n.cloud/webhook/2026 Pipeline`
5. Returns the n8n response (the webhook responds immediately with "Workflow got started", so we need to handle that -- the actual draft is created as an Outlook draft by n8n)

**Key difference**: The "2026 Pipeline" webhook responds immediately (not with the draft content). So the UI will show a success confirmation rather than streaming the draft back.

### Payload Shape (matching `email_pipeline_contacts_v`)

The edge function transforms the `EnhancedDraftPayload` into:

```typescript
{
  entity_key: string,          // "I:contactId" or "G:groupContact"
  is_group: boolean,
  group_contact: string | null,
  to_contact_id: string,
  first_name: string,
  full_name: string,
  to_emails: string,           // semicolon-separated
  organization: string,
  cc_emails: string | null,
  bcc_emails: string | null,
  focus_areas_ordered: string[],
  opening_focus_phrase: string,
  focus_area_blocks: Array<{
    focus_area: string,
    focus_area_display: string,
    has_addons: boolean,
    add_on_platforms: string,
    add_on_description: string,
    new_platform_description: string,
  }>,
  delta_days: number,
  effective_last_contact_date: string,
  next_due_date: string,
  days_until_due: number,
  is_overdue: boolean,
  overdue_days: number,
  tier12_active_count: number,
  has_tier12_active_opps: boolean,
  tier12_active_list: string,
}
```

This is essentially the same as `buildUnified2026Block()` in the existing `post_to_n8n`, but sent as the **root** payload (not nested under `unified_2026`).

---

## Part 2: Updated UI - Split Generate Button

Replace the single "Generate Draft with AI" button with a split button:

```text
+---------------------------------------------+
| [Draft 2026 Pipeline]  [v]                   |
|                        +---+                 |
|                        | Legacy Draft (n8n)  |
|                        +---+                 |
+---------------------------------------------+
```

- **Primary action** (visible button): "Draft 2026 Pipeline" -- calls the new webhook
- **Dropdown option**: "Legacy Draft" -- calls the existing `post_to_n8n` flow

### Behavior Differences

| | 2026 Pipeline | Legacy Draft |
|---|---|---|
| Webhook | `/webhook/2026 Pipeline` | `/webhook/Email-Builder` |
| Response | Immediate confirmation | Streams draft content back |
| Result UI | Success toast: "Draft created in Outlook" | Shows draft inline in UI |
| Edge Function | `post_to_n8n_2026` | `post_to_n8n` |

Since the 2026 Pipeline webhook responds immediately ("Workflow got started") and creates the draft directly in Outlook (via the n8n "Create a draft" node), the UI will:
1. Show a loading state while posting
2. On success, show a confirmation card: "Draft created in Outlook -- check your drafts folder"
3. No inline preview (the draft is in Outlook)

---

## Part 3: Include Email Module Content in Payload

The existing module selections (greetings, phrases, etc.) will be included in the payload as additional context that the n8n AI node can use. Specifically:

- `content.greeting` -- the selected greeting phrase
- `content.phrases` -- all resolved module phrases
- `content.inquiry` -- selected inquiry text
- `content.signature` -- selected signature
- `focusAreaLanguage` -- if "Use in Email" is toggled on

These are passed as supplementary fields in the payload so the Auto Email Builder's AI prompt can reference them.

---

## Part 4: Update n8n Auto Email Builder Prompts

Using the MCP connector, update the Auto Email Builder workflow's system and user prompts to:
1. Accept the new payload fields (module content, focus area language)
2. Use a modern greeting (replace "Happy New Year" / "I hope you had a relaxing holiday" with the greeting from the email modules, or a default like "Checking in" / "I hope you're doing well")
3. Incorporate the focus area language descriptions when provided

This will be done after the technical implementation is complete, as a separate step using the n8n MCP tools.

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/post_to_n8n_2026/index.ts` | **Create** | New edge function that transforms payload and posts to 2026 Pipeline webhook |
| `supabase/config.toml` | **Modify** | Add config for new edge function |
| `src/pages/EmailBuilder.tsx` | **Modify** | Add `handleGenerate2026Pipeline` handler, wire up to UI |
| `src/components/email-builder/EnhancedDraftSection.tsx` | **Modify** | Replace single button with split button (primary: 2026 Pipeline, dropdown: Legacy) |
| `src/lib/build2026PipelinePayload.ts` | **Create** | Transform `EnhancedDraftPayload` to pipeline view format |

---

## Technical Details

### `build2026PipelinePayload` function

Takes an `EnhancedDraftPayload` and produces the `email_pipeline_contacts_v`-shaped object. This reuses much of the logic from `buildUnified2026Block` in the existing edge function but also includes:

- `focus_area_blocks` with proper add-on descriptions from the contact's focus area data
- Module content as supplementary fields
- Focus area language override if selected

### Split Button Component

The `EnhancedDraftSection` will use a `DropdownMenu` alongside the primary button:

```typescript
<div className="flex gap-1">
  <Button onClick={onGenerate2026} disabled={disabled} size="lg" className="gap-2 flex-1">
    <Sparkles className="h-4 w-4" />
    Draft 2026 Pipeline
  </Button>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="lg" className="px-2">
        <ChevronDown className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onClick={onGenerateLegacy}>
        Legacy Draft (Email Builder)
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

### Response Handling

The 2026 Pipeline webhook responds immediately with "Workflow got started" (not with draft content). The n8n workflow then processes asynchronously and creates an Outlook draft. So the UI flow is:

1. User clicks "Draft 2026 Pipeline"
2. Payload is built and sent to edge function
3. Edge function posts to webhook, gets immediate 200 response
4. UI shows success: "Draft queued -- check Outlook drafts"
5. User checks Outlook for the generated draft

---

## Implementation Phases

**Phase 1** (this implementation):
- Create edge function and payload builder
- Update UI with split button
- Wire up the new flow end-to-end

**Phase 2** (follow-up):
- Update n8n Auto Email Builder system/user prompts via MCP
- Refine payload based on actual n8n requirements
- Add example email patterns to the prompts

