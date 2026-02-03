
# Plan: Restructure Individual Contact Drawer (7 tabs → 2 tabs)

## Summary

This plan consolidates the Individual Contact Drawer from 7 tabs to 2 tabs (Overview + Details), matching the client's requirements for a cleaner, more efficient UX. It also adds the ability to link contacts to opportunities and enhances social links with clickable icons.

---

## Part 1: New Tab Structure

### Tab 1: "Overview" - Primary working view

All the fields the user needs for day-to-day contact management:

```text
┌─────────────────────────────────────────────────────┐
│  ☑ Priority Contact                                │
├─────────────────────────────────────────────────────┤
│  Full Name          │ Organization │ Title         │
├─────────────────────────────────────────────────────┤
│  Max Lag (Days)     │ Follow-Up Days              │
├─────────────────────────────────────────────────────┤
│  LG Sector          │ LG Focus Areas Comprehensive │
│  Areas of Specialization                           │
├─────────────────────────────────────────────────────┤
│  GROUPS                                            │
│  [Group 1 - TO] [x]  [Group 2 - CC] [x]           │
│  [ + Add to Group ] [ + Create New Group ]         │
├─────────────────────────────────────────────────────┤
│  Notes        [Textarea] [Save]                    │
│  Next Steps   [Textarea + Due Date + Add to Do]    │
├─────────────────────────────────────────────────────┤
│  CONTACT HISTORY AT A GLANCE                       │
│  Most Recent Contact: Jan 15, 2026                 │
│  # of Total Contacts: 12                           │
│  # of Opportunities: 3                             │
└─────────────────────────────────────────────────────┘
```

### Tab 2: "Details" - Secondary info & relationships

All supporting information:

```text
┌─────────────────────────────────────────────────────┐
│  First Name         │ Last Name                    │
├─────────────────────────────────────────────────────┤
│  All Email Addresses (expandable list)              │
│  Phone                                             │
├─────────────────────────────────────────────────────┤
│  OPPORTUNITIES (AS DEAL SOURCE)                    │
│  [Deal 1]  [Deal 2]                                │
│  [ + Link to Opportunity ] [ + Create Opportunity ]│
├─────────────────────────────────────────────────────┤
│  FILES / ATTACHMENTS (collapsible)                 │
├─────────────────────────────────────────────────────┤
│  SOCIAL PROFILES & LINKS                           │
│  Online Bio URL    [input] [🔗 icon]               │
│  LinkedIn Profile  [input] [LinkedIn icon]         │
│  X / Twitter       [input] [X icon]                │
├─────────────────────────────────────────────────────┤
│  TEAM ASSIGNMENT                                   │
│  LG Lead (dropdown)                                │
│  LG Assistant (input)                              │
└─────────────────────────────────────────────────────┘
```

---

## Part 2: Fields Being Removed/Hidden

The following fields from the current drawer will be **removed** (per client request):

| Field | Current Location | Reason |
|-------|-----------------|--------|
| Email Address (primary) | Overview | Replaced by "All Email Addresses" in Details |
| Category | Overview | Client didn't mention it |
| Outreach Type | Tracking | Client: "get rid of Outreach Type email" |
| Intentional No Outreach | Tracking | Client didn't mention (still saved but not shown) |
| Follow-Up Recency Threshold | Tracking | Advanced setting, not needed |
| LG Focus Areas 1-8 (individual fields) | Details | Replaced by comprehensive list |
| Legacy Group Settings | Groups | Replace with new Groups UI |
| Recent Interactions | Activity | Not requested in new layout |
| Group Notes (Legacy) | Activity | Superseded by new groups system |

**Important**: These fields remain in the database and are still saved - they're just not displayed in the new streamlined UI.

---

## Part 3: Opportunities Enhancement

### Current State
- Shows list of opportunities where contact is deal source
- Name matching only (no ID linkage)
- No ability to add/link

### New Capabilities

1. **Link to Existing Opportunity**
   - Add dropdown/search to find opportunities
   - Update `deal_source_contact_1_id` or `deal_source_contact_2_id` on selected opportunity
   - Also update `deal_source_individual_1/2` with contact's full name for backward compatibility

2. **Create New Opportunity**
   - Button opens `AddOpportunityDialog`
   - Pre-fill `deal_source_individual_1` with contact's full name
   - Pre-fill `deal_source_contact_1_id` with contact's ID
   - On success, refresh opportunities list

### Database Considerations
The columns already exist:
- `deal_source_contact_1_id` (UUID FK to contacts_raw)
- `deal_source_contact_2_id` (UUID FK to contacts_raw)

No schema changes needed - just need to use these columns.

---

## Part 4: Groups Section Enhancement

### Current State
- Shows group memberships with remove button
- Add member modal exists for group drawer (not contact drawer)

### New Design for Overview Tab

```text
GROUPS
├── [Group A - TO] [x remove]
├── [Group B - CC] [x remove]
│
├── [ + Add to Group ▼ ]     ← Opens dropdown to select existing group
│     ├─ Group C
│     ├─ Group D
│     └─ ...
│
└── [ + Create New Group ]   ← Opens create group modal with contact pre-added
```

Implementation:
- Reuse `useContactGroups` hook (already in use)
- Create `AddContactToGroupDropdown` component (similar to AddMemberToGroupModal but inline)
- Reuse `useAddContactToGroup` hook
- For "Create New Group", open `BulkGroupAssignmentModal` in "new" mode with this contact pre-selected

---

## Part 5: Social Links with Clickable Icons

Add icon buttons next to each social link input:

```typescript
// LinkedIn
<div className="flex gap-2 items-end">
  <Input value={linkedin_url} onChange={...} />
  {linkedin_url && (
    <Button variant="ghost" size="icon" onClick={() => window.open(linkedin_url)}>
      <LinkedInIcon className="h-4 w-4" />
    </Button>
  )}
</div>
```

Icons to use:
- LinkedIn: Custom SVG or Lucide's `Linkedin` icon (need to check availability)
- X/Twitter: Custom SVG (Lucide has Twitter but need X logo)
- Website: `ExternalLink` from Lucide

---

## Part 6: Quick Stats Rename & Simplification

### Current
- Quick Stats: Most Recent Contact, # of Emails, # of Meetings, Follow-Up Date

### New (per client)
- **Contact History at a Glance**:
  - Most Recent Contact
  - # of Total Contacts (`of_emails + of_meetings`)
  - # of Opportunities (count from `useContactOpps`)

---

## Part 7: Notes & Next Steps in Overview

Use the existing `SimpleNotesInput` component (from opportunity drawer refactor) for a clean, timeline-free input:

For Notes:
```typescript
<SimpleNotesInput
  title="Notes"
  field="notes"
  placeholder="Enter notes..."
  onSave={(content) => saveNotes(content)}
  isSaving={isSavingNotes}
/>
```

For Next Steps (with due date + Add to Do):
```typescript
<SimpleNotesInput
  title="Next Steps"
  field="next_steps"
  placeholder="Enter next steps..."
  onSave={(content, dueDate, addInToDo) => saveNextSteps(content, dueDate, addInToDo)}
  isSaving={isSavingNextSteps}
/>
```

The timeline/history remains accessible via "View Full History" button in header.

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/contacts/ContactDrawer.tsx` | **Major Refactor** | Restructure from 7 tabs to 2 tabs |
| `src/components/contacts/ContactSimpleNotesInput.tsx` | **Create** | Adapt SimpleNotesInput for contacts (or reuse opportunity one) |
| `src/components/contacts/ContactGroupsSection.tsx` | **Create** | New groups UI with add/remove/create |
| `src/components/contacts/ContactOpportunitiesSection.tsx` | **Create** | Opportunities with link/create functionality |
| `src/components/contacts/AddContactToGroupDropdown.tsx` | **Create** | Dropdown to add contact to existing group |
| `src/components/contacts/LinkContactToOpportunityModal.tsx` | **Create** | Search/select opportunity to link contact |
| `src/hooks/useLinkContactToOpportunity.ts` | **Create** | Hook to update opportunity with contact ID |
| `src/hooks/useAllOpportunitiesSearch.ts` | **Create** | Hook to search opportunities for linking |

---

## Technical Implementation Details

### 1. Contact Simple Notes Input
Can reuse `SimpleNotesInput` from opportunities with minor type adjustment:
```typescript
field: 'next_steps' | 'notes' // For contacts
```

### 2. Link Contact to Opportunity
```typescript
// useLinkContactToOpportunity.ts
async function linkContact(opportunityId: string, contactId: string, slot: 1 | 2) {
  const field = slot === 1 ? 'deal_source_contact_1_id' : 'deal_source_contact_2_id';
  const nameField = slot === 1 ? 'deal_source_individual_1' : 'deal_source_individual_2';
  
  // Get contact name for backward compatibility
  const { data: contact } = await supabase
    .from('contacts_raw')
    .select('full_name')
    .eq('id', contactId)
    .single();
  
  await supabase
    .from('opportunities_raw')
    .update({ 
      [field]: contactId,
      [nameField]: contact?.full_name 
    })
    .eq('id', opportunityId);
}
```

### 3. Search Opportunities for Linking
```typescript
// useAllOpportunitiesSearch.ts
const { data } = await supabase
  .from('opportunities_raw')
  .select('id, deal_name, sector, status')
  .ilike('deal_name', `%${searchTerm}%`)
  .order('deal_name')
  .limit(20);
```

### 4. Social Link Icons
Use Lucide icons where possible, fall back to simple ExternalLink:
- LinkedIn: Use custom SVG (Lucide's Linkedin icon exists)
- X/Twitter: Use custom SVG for X logo
- Website: Use ExternalLink icon

---

## Implementation Order

1. **Create new hooks** (`useLinkContactToOpportunity`, `useAllOpportunitiesSearch`)
2. **Create new components** (ContactGroupsSection, ContactOpportunitiesSection, LinkContactToOpportunityModal, AddContactToGroupDropdown)
3. **Refactor ContactDrawer** - consolidate to 2 tabs using new components
4. **Add social link icons** with clickable external links
5. **Update Quick Stats** to "Contact History at a Glance"
6. **Test thoroughly** - ensure all save functionality works

---

## Visual Comparison

### Current (7 Tabs)
```
[Overview] [Details] [Groups] [Activity] [Tracking] [Opportunities] [Files]
```

### New (2 Tabs)  
```
[Overview] [Details]
```

All functionality is preserved - just reorganized for efficiency!
