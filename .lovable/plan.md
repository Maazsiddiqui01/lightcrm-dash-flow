

# Plan: Fix Edge Function Payload + Provide Complete n8n Prompts

## Problem

Two issues need fixing:

1. **Edge function bug**: The `post_to_n8n_2026` edge function currently hardcodes `add_on_platforms: ''` and `add_on_description: ''` for every focus area block. The actual `email_pipeline_contacts_v` view has these populated. Without this fix, emails will never include add-on content (e.g., Aspire Bakeries, GSF descriptions).

2. **n8n prompts**: The current system/user prompts reference `$json.*` (direct view fetching) but the webhook POST body arrives at `$json.body.*`. The prompts also hardcode "I hope you had a relaxing holiday" and "With the new year starting" which need to be dynamic based on the `module_content` fields.

---

## Part 1: Fix Edge Function -- Populate Add-On Data

The `build2026PipelinePayload` function in `supabase/functions/post_to_n8n_2026/index.ts` needs to properly group focus area descriptions by focus area and separate "New Platform" vs "Add-On" entries, matching the view's structure.

**Current (broken):**
```typescript
// Every block gets empty add-on fields
add_on_platforms: '',
add_on_description: '',
```

**Fixed approach:**
- Group all `faDescriptions` entries by focus area name
- For each focus area, find the "New Platform" entry and the "Add-On" entry separately
- Populate `new_platform_description` from the New Platform entry
- Populate `add_on_platforms` and `add_on_description` from the Add-On entry
- The `existingPlatform` field from add-on entries maps to `add_on_platforms`

Additionally, the `focusAreaLanguage` override should be applied: if the user toggled "Use in Email" for a specific focus area language entry, its description should replace (or supplement) the corresponding block's description.

**File**: `supabase/functions/post_to_n8n_2026/index.ts`

---

## Part 2: Complete n8n System Prompt (Copy-Paste Ready)

Key changes from the existing prompt:
- All field references changed from `$json.field` to `$json.body.field` (webhook POST body)
- "I hope you had a relaxing holiday" replaced with dynamic greeting from `module_content.greeting`, defaulting to "I hope you're doing well."
- "With the new year starting" replaced with "Checking in" or a neutral opener
- Focus area language override incorporated when `focus_area_language` is present and `useInEmail` is true
- Module content (phrases, inquiry, signature) referenced for the AI to incorporate
- Signature uses `module_content.signature` instead of hardcoded "Tom"

The complete prompts will be provided in the implementation, ready to copy-paste into the n8n "Message a model1" node.

---

## Part 3: Complete n8n User Prompt (Copy-Paste Ready)

Updated to reference `$json.body.*` fields:

```
first_name: {{$json.body.first_name}}
full_name: {{$json.body.full_name}}
organization: {{$json.body.organization}}
to_emails: {{$json.body.to_emails}}
cc_emails: {{$json.body.cc_emails}}
has_tier12_active_opps: {{$json.body.has_tier12_active_opps}}
tier12_active_list: {{$json.body.tier12_active_list}}
tier12_active_list_english: {{ ... expression ... }}
focus_area_blocks: {{$json.body.focus_area_blocks.toJsonString()}}
focus_area_count: {{$json.body.focus_area_blocks.length}}
module_greeting: {{$json.body.module_content.greeting ?? ""}}
module_signature: {{$json.body.module_content.signature ?? "Tom"}}
module_inquiry: {{$json.body.module_content.inquiry ?? ""}}
focus_area_language: {{$json.body.focus_area_language ? $json.body.focus_area_language.toJsonString() : ""}}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/post_to_n8n_2026/index.ts` | Fix add-on data population, apply focus area language override |

---

## Technical Details

### Add-On Grouping Logic

The enhanced payload's `focusAreas.descriptions` has entries like:
```
{ focusArea: "Food Manufacturing", platformAddon: "New Platform", description: "Within F&B..." }
{ focusArea: "Food Manufacturing", platformAddon: "Add-On", description: "For Aspire...\nFor GSF..." }
```

These need to be merged into a single `focus_area_block` per focus area:
```json
{
  "focus_area": "Food Manufacturing",
  "focus_area_display": "F&B",
  "has_addons": true,
  "add_on_platforms": "Aspire Bakeries, Golden State Foods",
  "add_on_description": "For Aspire, the most attractive...\nFor GSF, we're interested...",
  "new_platform_description": "Within F&B, we are particularly interested in..."
}
```

The `add_on_platforms` field comes from the `existingPlatform` column in `focus_area_description` table (mapped as `Existing Platform (for Add-Ons)` in the data). Since the enhanced payload doesn't currently carry this field, we need to either:
- (a) Look it up from the fa_descriptions data in the edge function, or
- (b) Fetch it from the database in the edge function

Option (a) is preferred. The `faDescriptions` from the enhanced payload has limited fields. We will need to also pass the `existingPlatform` data through the payload. This means a small update to the enhanced payload builder to include the existing platform name for add-on entries.

### System Prompt Changes Summary

1. Replace hardcoded "I hope you had a relaxing holiday" with: use `module_greeting` if provided, otherwise "I hope you're doing well."
2. Replace "With the new year starting" with "Checking in" as the opener
3. Add rule: if `focus_area_language` is provided and non-empty, use its description for the matching focus area block instead of the default `new_platform_description`
4. Update signature to use `module_signature` field
5. All `$json.field` references become `$json.body.field`

