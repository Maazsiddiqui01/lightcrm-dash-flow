

# Fix Email Sync: contact_email_addresses → contacts_raw

## Problem
When a primary email is changed directly in Supabase (via the `contact_email_addresses` table), the `contacts_raw.email_address` field does not update. The sync currently only happens through application code in `useContactEmails.ts`. This means the contacts search/table shows stale emails.

## Fix

**Single migration** that does two things:

### 1. Immediate data fix
Update John Lanza's `contacts_raw.email_address` from `jlanza@cascadiacapital.com` to `john.lanza@cantor.com` to match his current primary in `contact_email_addresses`.

### 2. Prevent future occurrences — add a database trigger
Create a trigger `sync_primary_email_to_contacts_raw` on `contact_email_addresses` that fires on INSERT or UPDATE. When a row has `is_primary = true`, it automatically updates `contacts_raw.email_address` to match. This ensures direct Supabase edits stay in sync.

| Change | Detail |
|--------|--------|
| Migration SQL | UPDATE John Lanza's email + CREATE trigger function + CREATE trigger on `contact_email_addresses` |
| No code changes needed | The trigger handles sync at the DB level |

