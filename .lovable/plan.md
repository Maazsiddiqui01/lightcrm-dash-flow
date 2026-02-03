
# Plan: Restructure Individual Contact Drawer (7 tabs → 2 tabs)

## Status: ✅ COMPLETED

---

## Summary

Consolidated the Individual Contact Drawer from 7 tabs to 2 tabs (Overview + Details), matching the client's requirements for a cleaner, more efficient UX. Added ability to link contacts to opportunities and enhanced social links with clickable icons.

---

## Completed Changes

### New Tab Structure

**Tab 1: "Overview"** - Primary working view
- ☑ Priority Contact checkbox
- Full Name, Organization, Title
- Max Lag (Days), Follow-Up Days
- LG Sector, LG Focus Areas Comprehensive List, Areas of Specialization
- Groups section with add/remove/create capabilities
- Notes input (simple, no timeline)
- Next Steps input (with due date + Add to Do)
- Contact History at a Glance (Most Recent Contact, # of Contacts, # of Opportunities)

**Tab 2: "Details"** - Secondary info & relationships
- First Name, Last Name
- All Email Addresses (expandable with add/remove)
- Phone
- Opportunities (as Deal Source) with Link/Create functionality
- Files / Attachments (collapsible)
- Social Profiles & Links with clickable icons (LinkedIn, X/Twitter, Bio URL)
- Team Assignment (LG Lead dropdown, LG Assistant input)

---

## Files Created

| File | Description |
|------|-------------|
| `src/hooks/useAllOpportunitiesSearch.ts` | Hook to search opportunities for linking |
| `src/hooks/useLinkContactToOpportunity.ts` | Hook to link/unlink contacts to opportunities |
| `src/components/contacts/ContactGroupsSection.tsx` | New groups UI with add/remove/create |
| `src/components/contacts/ContactOpportunitiesSection.tsx` | Opportunities with link/create functionality |
| `src/components/contacts/ContactSimpleNotesInput.tsx` | Simple notes input without timeline |

## Files Modified

| File | Description |
|------|-------------|
| `src/components/contacts/ContactDrawer.tsx` | Major refactor from 7 tabs to 2 tabs |

---

## Fields Removed from UI (still in database)

- Email Address (primary) - Replaced by "All Email Addresses" in Details
- Category - Client didn't request
- Outreach Type - Per client request
- Intentional No Outreach - Not displayed
- Follow-Up Recency Threshold - Advanced setting hidden
- LG Focus Areas 1-8 (individual) - Using comprehensive list only
- Legacy Group Settings - Replaced with new Groups UI
- Recent Interactions - Not in new layout
- Group Notes (Legacy) - Superseded by groups system

---

## Implementation Complete
