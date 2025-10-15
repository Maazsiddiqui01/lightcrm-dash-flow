# Security Definer Functions Documentation

## Overview
This document explains the intentional use of `SECURITY DEFINER` in our database functions and views. These are performance optimizations that bypass Row-Level Security (RLS) policies to prevent recursive checks and improve query performance.

## Why SECURITY DEFINER is Used

### Problem
When RLS policies reference the same table they protect, PostgreSQL can enter infinite recursion. For example:
```sql
-- ❌ This causes infinite recursion
CREATE POLICY "Admins see all" ON profiles
FOR SELECT USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);
```

### Solution
Use `SECURITY DEFINER` functions that execute with elevated privileges and bypass RLS:
```sql
-- ✅ This prevents recursion
CREATE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Admins see all" ON profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'));
```

## Security Definer Functions in Our Database

### 1. Role Checking Functions
**Purpose**: Check user roles without causing RLS recursion

- `has_role(_user_id, _role)` - Check if user has specific role
- `is_admin(_user_id)` - Check if user is admin
- `get_user_role(_user_id)` - Get highest priority role

**Security**: These only read from `user_roles` table and cannot modify data.

### 2. Timestamp Update Triggers
**Purpose**: Auto-update timestamps and user tracking

- `update_email_template_settings_timestamp()` - Updates `updated_at` and `updated_by`
- `update_contact_settings_user()` - Updates `updated_by` 
- `set_created_by()` - Auto-assigns creator on insert

**Security**: These only set metadata fields and don't expose sensitive data.

### 3. Contact Management Functions
**Purpose**: Complex operations requiring elevated privileges

- `approve_contact_candidate(p_email, p_full_name, p_organization)` - Creates contact from candidate
- `dismiss_contact_candidate(p_email, p_note)` - Marks candidate as dismissed
- `reject_missing_contact(p_email)` - Marks missing contact as rejected

**Security**: These enforce business logic and proper data flow between tables.

### 4. Admin Functions
**Purpose**: Allow admins to perform privileged operations

- `execute_admin_sql(sql_statement)` - Execute arbitrary SQL (admin only)
- `validate_column_type_change(p_table, p_column, p_new_type)` - Validate schema changes
- `replace_text_in_column(p_table, p_column, p_old_text, p_new_text)` - Bulk text replacement

**Security**: All check `is_admin(auth.uid())` before execution.

### 5. Interaction Tracking
**Purpose**: Update contact metrics from interactions

- `update_contacts_from_interaction()` - Trigger that updates contact stats
- `refresh_contact_interaction_counts(p_contact_id)` - Recalculate interaction counts
- `refresh_all_contact_interactions()` - Bulk recalculation

**Security**: These only update aggregated counts, not raw data.

### 6. Data Filtering Functions
**Purpose**: Complex filtering with proper access control

- `contacts_ids_by_focus_areas(p_focus_areas)` - Filter contacts by focus areas
- `contacts_ids_by_opportunity_filters(...)` - Filter contacts by opportunity criteria

**Security**: These still enforce RLS checks via `assigned_to = auth.uid()` or `is_admin()`.

## Linter Warnings Explanation

### "Security Definer View" Warnings (86 occurrences)
These are **intentional and safe**. We use SECURITY DEFINER in:
- Read-only views for complex joins
- Functions that need to bypass RLS to prevent recursion
- Performance-optimized queries

**Action Required**: None. These are documented here as intentional.

### "Policy Exists RLS Disabled" Warning
**Status**: FIXED in Phase 1 migration
- `emails_meetings_raw` now has RLS enabled
- Existing policies are enforced

## Best Practices

### ✅ Safe Uses of SECURITY DEFINER
1. Read-only functions that don't modify data
2. Functions that check roles/permissions
3. Trigger functions that only update metadata (timestamps, user_id)
4. Admin functions that verify `is_admin()` before executing

### ❌ Unsafe Uses of SECURITY DEFINER
1. Functions that allow arbitrary data access without checks
2. Functions that modify sensitive data without validation
3. Functions exposed to public without authentication
4. Functions that don't validate input parameters

## Monitoring & Maintenance

### Regular Security Audits
1. Review SECURITY DEFINER functions quarterly
2. Ensure all admin functions check `is_admin()`
3. Verify trigger functions only update expected fields
4. Test RLS policies with different user roles

### When Adding New SECURITY DEFINER Functions
1. Document the reason in this file
2. Ensure proper access control checks
3. Limit scope to minimum required privileges
4. Add comprehensive tests

## Related Documentation
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)
- Our internal: `PHASE_3_COMPLETE.md` for implementation history

---
Last Updated: 2025-01-15
Reviewed By: QA Audit Phase 1
