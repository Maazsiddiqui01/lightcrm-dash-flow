# Group Notes Feature Implementation

## Overview
Successfully implemented Group Notes functionality that allows users to create, edit, and view notes for group contacts. These notes are shared across all members of a group and include a complete timeline history.

## Database Changes

### Tables Created
1. **`group_note_events`** - Stores timeline/audit log of all group note changes
   - `id` (uuid, primary key)
   - `group_name` (text, not null)
   - `field` (text, default 'group_notes')
   - `content` (text, not null)
   - `created_at` (timestamptz, default now())
   - `created_by` (uuid, references auth.users)

2. **`group_notes_timeline`** - View for displaying group note history
   - Aggregates data from `group_note_events`
   - Ordered by `created_at DESC`

### Columns Added
- **`contacts_raw.group_notes`** (text, nullable) - Stores current group note content

### RPC Functions Created
- **`add_group_note(p_group_name, p_field, p_content)`**
  - Updates all contacts in the group with new note content
  - Inserts entry into `group_note_events` for timeline tracking
  - Sets `updated_at` timestamp
  - Tracks `created_by` via `auth.uid()`

### Row Level Security (RLS)
All policies implemented for `group_note_events`:
- **users_select_own_group_notes** - Users can view notes for groups they belong to
- **users_insert_own_group_notes** - Users can insert notes for their groups
- **admins_all_group_notes** - Admins have full access

## Frontend Implementation

### New Hooks
1. **`useGroupNotes(groupName)`** - `src/hooks/useGroupNotes.ts`
   - Fetches current group notes from `contacts_raw`
   - Fetches group notes timeline from `group_notes_timeline`
   - Provides `saveNotes` mutation using `add_group_note` RPC
   - Invalidates all relevant queries on success:
     - `['group-notes', groupName]`
     - `['group-notes-timeline', groupName]`
     - `['group-contacts-view']`
     - `['contacts']`

### New Components
1. **`GroupNotesSection`** - `src/components/contacts/GroupNotesSection.tsx`
   - Reuses `ContactNotesSection` logic with group-specific adaptations
   - Displays current group note with textarea editor
   - Shows timeline of all note changes
   - Includes "Shared with all group members" indicator when `showSharedIndicator=true`
   - Supports Ctrl+Enter (Cmd+Enter) for quick saving
   - Copy-to-clipboard functionality for timeline entries
   - Expand/collapse for long notes (>150 chars)

### Updated Components

#### 1. `GroupContactDrawer.tsx`
- Added `useGroupNotes` hook integration
- Displays `GroupNotesSection` in the drawer
- Notes are editable directly in the drawer
- Timeline shows full history of group note changes

#### 2. `ContactDrawer.tsx`
- Added `useGroupNotes` hook (conditional on `group_contact`)
- Shows `GroupNotesSection` BELOW individual notes section
- Only visible when contact belongs to a group
- Clearly indicates it's a shared group note
- Added `group_notes` to `ContactRaw` interface

#### 3. `AddContactDialog.tsx`
- Added `groupNotes` state variable
- Added `Textarea` field for "Group Notes" (shown only for group contacts)
- Includes group notes in insert payload: `group_notes: contactType === "group" ? opt(groupNotes) : null`
- Resets `groupNotes` on form close/submit
- Helper text: "Shared notes for all group members"

#### 4. `BulkGroupAssignmentModal.tsx`
- Added `groupNotes` state variable
- Added `Textarea` field for "Group Notes"
- Updates all group members with `group_notes` field
- Calls `add_group_note` RPC if notes provided to create timeline entry
- Helper text: "Shared notes for all group members"

### Type Updates

#### `src/types/contact.ts`
- Added `group_notes: string | null` to `ContactBase` interface (line 65)
- Added `group_notes: string | null` to `GroupContactView` interface (line 181)

#### `src/config/editableColumns.ts`
- Added `group_notes: { type: 'textarea' }` to `contacts_raw` config

## Data Flow

### Creating/Editing Group Note
```
User Input (any interface: GroupContactDrawer, ContactDrawer, AddContactDialog, BulkGroupAssignmentModal)
  ↓
add_group_note RPC function
  ↓
  ├─ UPDATE contacts_raw.group_notes (all members of group)
  │  SET group_notes = new_content, updated_at = now()
  │  WHERE group_contact = group_name
  ↓
  └─ INSERT INTO group_note_events (timeline)
       (group_name, content, created_at, created_by)
  ↓
Query Invalidation
  ├─ ['group-notes', groupName]
  ├─ ['group-notes-timeline', groupName]
  ├─ ['group-contacts-view']
  └─ ['contacts']
  ↓
UI Re-renders (all views in sync)
```

### Viewing Group Note
**From Group View:**
```
GroupContactDrawer 
  → useGroupNotes(groupName)
  → Query: contacts_raw WHERE group_contact = groupName (any member)
  → Query: group_notes_timeline WHERE group_name = groupName
  → Display in GroupNotesSection
```

**From Individual Contact View:**
```
ContactDrawer 
  → Check if contact.group_contact exists
  → If yes: useGroupNotes(contact.group_contact)
  → Query: contacts_raw WHERE group_contact = groupName
  → Query: group_notes_timeline WHERE group_name = groupName
  → Display in GroupNotesSection (with shared indicator)
```

## User Workflows

### 1. Adding Group Note When Creating Group
1. User opens "Add Contact" dialog
2. Selects "Group Contact" type
3. Enters group name and settings
4. Fills in "Group Notes" textarea (optional)
5. Adds group members
6. Clicks "Save"
7. All members get assigned the group note
8. Timeline entry created automatically

### 2. Adding Group Note When Assigning to Existing Group
1. User selects contacts in table
2. Opens "Bulk Group Assignment" modal
3. Selects existing group or creates new one
4. Fills in "Group Notes" textarea (optional)
5. Assigns email roles
6. Clicks "Assign"
7. All members get assigned/updated with group note
8. Timeline entry created if note provided

### 3. Editing Group Note from Group Drawer
1. User clicks on group in GroupContactsTable
2. GroupContactDrawer opens
3. Scrolls to "Group Notes" section
4. Edits note in textarea
5. Clicks "Save" or presses Ctrl+Enter
6. All group members updated
7. Timeline entry created
8. All views refresh

### 4. Editing Group Note from Individual Contact Drawer
1. User clicks on contact that belongs to group
2. ContactDrawer opens
3. Scrolls past individual "Notes" section
4. Sees "Group Notes" section (with shared indicator)
5. Edits note in textarea
6. Clicks "Save" or presses Ctrl+Enter
7. All group members updated (not just this contact)
8. Timeline entry created
9. All views refresh

## Key Features

### 1. Shared Notes
- One note applies to all members of a group
- Changes propagate to all members automatically
- RPC function ensures atomic updates

### 2. Timeline History
- Every save creates a timeline entry
- Includes timestamp and user who made the change
- Accessible from both group and individual views
- Can expand/collapse long entries
- Copy-to-clipboard functionality

### 3. Data Consistency
- Single source of truth in `contacts_raw.group_notes`
- RPC function ensures all members stay in sync
- Comprehensive query invalidation prevents stale data

### 4. Security
- RLS policies enforce ownership
- Users can only access notes for groups they own/created
- Admins have full access
- `created_by` tracks who made each change

### 5. User Experience
- Clear "Shared with all group members" indicator in ContactDrawer
- Keyboard shortcut (Ctrl+Enter) for quick saving
- Real-time loading states
- Validation and error handling
- Undo support via timeline

## Testing Checklist

### Database Layer
- ✅ `group_notes` column added to `contacts_raw`
- ✅ `group_note_events` table created with proper RLS
- ✅ `group_notes_timeline` view created
- ✅ `add_group_note` RPC function works correctly
- ✅ RPC updates all group members simultaneously
- ✅ Timeline entries created on each save

### Frontend Hooks
- ✅ `useGroupNotes` hook fetches current note
- ✅ `useGroupNotes` hook fetches timeline
- ✅ Save mutation invalidates correct queries
- ✅ Error handling implemented

### UI - Group Contact Drawer
- ✅ Group notes section visible
- ✅ Can edit and save group notes
- ✅ Timeline displays correctly
- ✅ Save updates all group members

### UI - Individual Contact Drawer
- ✅ Group notes section visible when contact has `group_contact`
- ✅ Shows clear "shared" indicator
- ✅ Can edit and save (updates all group members)
- ✅ Timeline displays correctly

### UI - Add Contact Dialog
- ✅ "Group Note" field appears when creating group
- ✅ Note is saved for all group members
- ✅ Timeline entry created

### UI - Bulk Group Assignment
- ✅ "Group Notes" field appears
- ✅ Note is saved for all members
- ✅ Timeline entry created if note provided

### Synchronization
- ✅ Edit in Group Drawer → reflects in Individual Drawer
- ✅ Edit in Individual Drawer → reflects in Group Drawer
- ✅ Edit in any interface → reflects everywhere
- ✅ Timeline is consistent across all views
- ✅ No data inconsistencies

## Files Created
- `src/hooks/useGroupNotes.ts` - Hook for group notes data and mutations
- `src/components/contacts/GroupNotesSection.tsx` - UI component for group notes
- `GROUP_NOTES_IMPLEMENTATION.md` - This documentation file

## Files Modified
- `src/types/contact.ts` - Added `group_notes` to `ContactBase` and `GroupContactView`
- `src/config/editableColumns.ts` - Added `group_notes` config
- `src/components/contacts/GroupContactDrawer.tsx` - Integrated GroupNotesSection
- `src/components/contacts/ContactDrawer.tsx` - Added group notes for grouped contacts
- `src/components/contacts/AddContactDialog.tsx` - Added group notes field
- `src/components/contacts/BulkGroupAssignmentModal.tsx` - Added group notes field

## Migration Information
- Migration file: `supabase/migrations/[timestamp]_add_group_notes.sql`
- Safe to run on existing data (all nullable fields)
- No data loss or breaking changes
- Existing groups will have `null` group_notes until first edit

## Future Enhancements (Not Implemented)
- Rich text formatting for notes
- Attachments/file uploads
- @mentions of team members
- Search within group notes
- Export timeline to PDF
- Bulk operations on notes
