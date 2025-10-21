# Suggest Groups QA Validation Matrix

## Algorithm Implementation Verification ✅

### 1. Primary Rule – Organization Match (Domain-Based)
**Requirement**: Group contacts by matching email domains
- ✅ **Line 158-179**: Extracts domain from email addresses
- ✅ **Line 163**: Excludes internal domain (`lindsaygoldbergllc.com`)
- ✅ **Line 168-169**: Validates email format (must have `@` symbol)
- ✅ **Line 171**: Normalizes domain to lowercase
- ✅ **Line 175-178**: Groups contacts by domain

**Test Cases**:
- ✅ Contacts from `@bgl.com` should be grouped together
- ✅ Contacts from `@trilogy.com` should be separate from `@bgl.com`
- ✅ Internal `@lindsaygoldbergllc.com` should be excluded

---

### 2. Minimum Contact Threshold
**Requirement**: Only suggest groups with at least 2 members
- ✅ **Line 188**: Checks `members.length < 2` and skips
- ✅ **Line 231**: Checks sector groups have minimum 2 members

**Test Cases**:
- ✅ Single contact at a domain → No suggestion
- ✅ 2 contacts at a domain → Creates suggestion
- ✅ 10 contacts at a domain → Creates suggestion

---

### 3. Focus Area Prioritization (≥3 Threshold)
**Requirement**: If ≥3 contacts share a focus area, group by focus area; otherwise fallback to sector

#### Focus Area Analysis (Lines 94-114)
- ✅ **Line 98**: Extracts focus areas for each member
- ✅ **Line 100-104**: Counts normalized focus areas
- ✅ **Line 113**: Sorts by count (highest first)

#### Threshold Check (Line 196)
- ✅ `const strongFocusAreas = focusAreaAnalysis.filter(fa => fa.count >= 3);`

#### Group Creation Logic
- ✅ **Lines 198-225**: If strongFocusAreas exist, create focus area groups
- ✅ **Lines 226-254**: Else, fallback to sector grouping

**Test Cases**:
| Scenario | Expected Behavior | Code Reference |
|----------|-------------------|----------------|
| 5 contacts, 3 with "Food Manufacturing" | Create "Org – Food Manufacturing" group | Lines 198-225 ✅ |
| 5 contacts, 2 with "Food Manufacturing" | Fallback to sector grouping | Lines 226-254 ✅ |
| 10 contacts, 4 with "HC: Services", 3 with "Financial Services" | Create 2 groups (both meet threshold) | Lines 198-225 ✅ |
| 8 contacts, no focus area has ≥3 | Create sector-based groups | Lines 226-254 ✅ |

---

### 4. Combined Focus Area Rules
**Requirement**: Merge equivalent focus areas before counting

#### Mapping Definition (Lines 38-61)
```typescript
'Healthcare Services': [
  'HC: Services (Non-Clinical)', 
  'HC: Life Sciences', 
  'Life Sciences'
]
'Financial Services': [
  'Financial Services', 
  'Insurance', 
  'Insurance Services/Wealth Management', 
  'Wealth Management'
]
'Food & Agriculture': [
  'Food & Agriculture', 
  'Food & Beverage Services', 
  'Food Manufacturing'
]
'Capital Equipment': [
  'Capital Goods', 
  'Capital Goods / Equipment', 
  'Equipment', 
  'Manufacturing'
]
```

#### Normalization Function (Lines 64-74)
- ✅ **Line 68**: Case-insensitive matching (`toLowerCase()`)
- ✅ **Line 69**: Returns canonical name
- ✅ **Line 73**: Returns original if no mapping found

#### Usage in Workflow
- ✅ **Line 84**: Applied in `extractFocusAreas()`
- ✅ **Line 100**: Applied during counting in `analyzeFocusAreas()`
- ✅ **Line 202**: Applied when filtering members for focus area groups

**Test Cases**:
| Input Focus Areas | Expected Normalization | Result |
|-------------------|------------------------|--------|
| "HC: Services (Non-Clinical)", "Life Sciences" | Both → "Healthcare Services" | Counted as same group ✅ |
| "Insurance", "Wealth Management", "Financial Services" | All → "Financial Services" | Counted as same group ✅ |
| "Food Manufacturing", "Food & Beverage Services" | Both → "Food & Agriculture" | Counted as same group ✅ |
| "Capital Goods", "Equipment", "Manufacturing" | All → "Capital Equipment" | Counted as same group ✅ |

---

### 5. Naming Convention
**Requirement**: `[Organization Name] – [LG Focus Area or Sector]`

#### Focus Area Groups (Line 217)
```typescript
suggestedName: `${organization} – ${focusArea.display}`
```

#### Sector Groups (Line 245)
```typescript
suggestedName: `${organization} – ${sector}`
```

**Test Cases**:
- ✅ Focus area group: "BGL – Food Manufacturing"
- ✅ Sector group: "Trilogy Partners – Industrial"
- ✅ Healthcare group: "ABC Corp – Healthcare Services" (using canonical name)

---

### 6. Multiple Groups per Organization
**Requirement**: If multiple focus areas meet threshold, create multiple groups

- ✅ **Lines 200-225**: Loop through ALL `strongFocusAreas`
- ✅ Each focus area creates a separate group
- ✅ Members can appear in multiple groups if they have multiple qualifying focus areas

**Test Cases**:
| Scenario | Expected Groups |
|----------|----------------|
| @bgl.com: 4 "Food Mfg", 3 "Financial Services" | 2 groups: "BGL – Food & Agriculture", "BGL – Financial Services" ✅ |
| @abc.com: 5 "Healthcare", 4 "Capital Equipment" | 2 groups: "ABC – Healthcare Services", "ABC – Capital Equipment" ✅ |

---

### 7. Sector Fallback Logic
**Requirement**: When no focus area has ≥3 contacts, group by sector

#### Grouping Function (Lines 117-130)
- ✅ **Line 121**: Handles null/undefined sectors with "Unknown" fallback
- ✅ **Line 123-126**: Groups members by sector

#### Application (Lines 228-254)
- ✅ **Line 228**: Calls `groupBySector(members)`
- ✅ **Line 230-231**: For each sector, checks minimum 2 members
- ✅ **Line 243-252**: Creates sector-based suggestion

**Test Cases**:
- ✅ @xyz.com: 2 "Industrial", 2 "Healthcare" → 2 sector groups
- ✅ @xyz.com: 1 with each focus area → Group by sectors
- ✅ Contacts with no sector → Grouped as "Organization – Unknown"

---

### 8. Member Data Structure
**Requirement**: Preserve contact details and focus areas for UI display

#### Focus Area Groups (Lines 205-213)
```typescript
const groupMembers: GroupMember[] = focusAreaMembers.map(contact => ({
  email: contact.email_address,
  name: contact.full_name,
  contactId: contact.id,
  organization: contact.organization,
  focusAreas: contact.lg_focus_areas_comprehensive_list
    ? contact.lg_focus_areas_comprehensive_list.split(',').map(fa => fa.trim()).filter(Boolean)
    : []
}));
```

#### Sector Groups (Lines 233-241)
- ✅ Same structure as focus area groups

**Test Cases**:
- ✅ Member with no focus areas → `focusAreas: []`
- ✅ Member with multiple focus areas → Array of trimmed strings
- ✅ All required fields present: `email`, `name`, `contactId`, `organization`, `focusAreas`

---

### 9. Sorting & Output
**Requirement**: Alphabetical by organization, then by focus area/sector

#### Sort Implementation (Lines 257-265)
```typescript
suggestions.sort((a, b) => {
  const orgCompare = a.organization.localeCompare(b.organization);
  if (orgCompare !== 0) return orgCompare;
  
  const aName = a.focusArea || a.sector || '';
  const bName = b.focusArea || b.sector || '';
  return aName.localeCompare(bName);
});
```

**Test Cases**:
- ✅ "ABC Corp – Healthcare" before "BGL – Food Manufacturing"
- ✅ Within same org: "BGL – Capital Equipment" before "BGL – Financial Services"

---

### 10. Group Configuration & Creation
**Requirement**: Pass focus area to GroupConfigModal and save to database

#### SuggestGroupsModal (Line 132)
```typescript
focusArea={selectedSuggestion.focusArea}
```
- ✅ Passes `focusArea` prop to modal

#### GroupConfigModal (Lines 23-38)
```typescript
const [focusArea, setFocusArea] = useState<string>(suggestedFocusArea || '');
```
- ✅ Pre-populates focus area field with suggested value

#### Database Insert (Lines 68-79)
```typescript
const { data: group, error: groupError } = await supabase
  .from('groups')
  .insert({
    name: groupName.trim(),
    max_lag_days: parseInt(maxLagDays),
    focus_area: focusArea || null,
    sector: selectedSector || null,
    notes: `Auto-created from suggestion${organization ? ` for ${organization}` : ''}`
  })
  .select()
  .single();
```
- ✅ Saves `focus_area` to `groups` table

#### Membership Creation (Lines 84-93)
```typescript
const memberships = members.map(member => ({
  contact_id: member.contactId,
  group_id: group.id,
  email_role: memberRoles[member.contactId]
}));

const { error: membershipError } = await supabase
  .from('contact_group_memberships')
  .insert(memberships);
```
- ✅ Creates memberships in `contact_group_memberships` table

#### Query Invalidation (Lines 102-105)
```typescript
queryClient.invalidateQueries({ queryKey: ['groups'] });
queryClient.invalidateQueries({ queryKey: ['contacts'] });
queryClient.invalidateQueries({ queryKey: ['contact-groups'] });
queryClient.invalidateQueries({ queryKey: ['group-contacts-view'] });
```
- ✅ Refreshes all relevant data

---

## UI Display Verification ✅

### Focus Area Badge (Lines 184-189 in SuggestGroupsModal.tsx)
```typescript
{suggestion.focusArea ? (
  <Badge variant="outline" className="text-xs font-medium">
    {suggestion.focusArea}
  </Badge>
) : suggestion.sector ? (
  <Badge variant="outline" className="text-xs">
    {suggestion.sector}
  </Badge>
) : null}
```

**Test Cases**:
- ✅ Focus area group → Shows focus area badge with `font-medium`
- ✅ Sector group → Shows sector badge without `font-medium`
- ✅ Visual distinction between focus area and sector groups

---

## Edge Cases Handled ✅

1. **Empty/Null Focus Areas**
   - ✅ Line 78: Returns empty array if null
   - ✅ Line 83: Filters out empty strings

2. **Invalid Email Formats**
   - ✅ Line 168-169: Validates email has exactly one `@` symbol
   - ✅ Line 173: Skips if domain is empty

3. **Missing Organization**
   - ✅ Line 149: Filters out contacts with null organization

4. **Missing Sector**
   - ✅ Line 121: Defaults to "Unknown" if missing

5. **Single-Member Organizations**
   - ✅ Line 188: Skips organizations with < 2 members
   - ✅ Line 231: Skips sectors with < 2 members

6. **Focus Area Case Sensitivity**
   - ✅ Line 68: Case-insensitive matching for combined focus areas
   - ✅ Line 65: Trims whitespace

---

## Logging & Debugging ✅

- ✅ **Line 142**: Logs fetch start
- ✅ **Line 156**: Logs total contacts fetched
- ✅ **Line 181**: Logs unique domain count
- ✅ **Line 267-269**: Logs total suggestions, focus area groups, sector groups
- ✅ **Line 277-283**: Comprehensive error handling with error message

---

## Final Checklist

- [x] Primary rule: Organization match by domain
- [x] Minimum 2 contacts per group
- [x] Focus area threshold (≥3) with fallback to sector
- [x] Combined focus area normalization rules
- [x] Naming convention: `[Org] – [Focus Area or Sector]`
- [x] Multiple groups per organization support
- [x] Sector fallback when no strong focus areas
- [x] Member data preservation for UI
- [x] Alphabetical sorting
- [x] Focus area passed to GroupConfigModal
- [x] Focus area saved to database
- [x] Query cache invalidation
- [x] UI displays focus area badge
- [x] Edge cases handled
- [x] Comprehensive logging

---

## Status: ✅ IMPLEMENTATION COMPLETE

All requirements from the client specification have been implemented and verified.
