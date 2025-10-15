# Console.log Production Audit

## Overview
This document tracks console.log statements in production code to balance debugging capabilities with production cleanliness.

## Statistics
- **Total console.log statements:** 282
- **Files affected:** 101
- **Status:** AUDITED

## Strategy
Rather than removing all console.log statements, we've adopted a strategic approach:
1. **Keep:** Debug logs with clear prefixes for production troubleshooting
2. **Remove:** Logs that expose sensitive data or provide no value
3. **Standardize:** All kept logs use consistent prefixes

## Categorization

### Category 1: Performance Monitoring (KEEP)
These logs track query performance and data flow, valuable for production debugging.

**Files:**
- `src/hooks/useContactStats.ts` - Tracks filter operations and RPC calls
- `src/hooks/useContactsWithOpportunities.ts` - Monitors contact fetching performance
- `src/components/interactions/InteractionsTable.tsx` - Tracks pagination and data loading

**Prefix:** `[ContactStats]`, `[Contacts#${reqId}]`

### Category 2: Feature Debugging (KEEP)
Debug logs for complex features that may need production troubleshooting.

**Files:**
- `src/hooks/useContactPhrasePreferences.ts` - Phrase preference system
- `src/hooks/useAutoSelectPhrases.ts` - Auto-selection logic
- `src/components/email-builder/PhraseSelectorGeneric.ts` - Default phrase management
- `src/components/email-builder/ContactOverrideDrawer.tsx` - Override system
- `src/components/contacts/ContactPreview.ts` - Preview configuration

**Prefix:** `[PHRASE_PREF_DEBUG]`, `[DEFAULT_PHRASE_DEBUG]`, `[OVERRIDE_DRAWER_DEBUG]`, `[CONTACT_PREVIEW_DEBUG]`

### Category 3: Integration Logging (KEEP)
Logs for external integrations that may fail in production.

**Files:**
- `src/components/email-builder/DraftPreviewPanel.tsx` - n8n integration
- `src/components/contacts/AIContactSearch.tsx` - AI tools integration

**Prefix:** None (but valuable for debugging external APIs)

### Category 4: Operational Logs (KEEP)
Logs that track user operations and state changes.

**Files:**
- `src/components/email-builder/LivePreviewPanel.tsx` - Preview rendering
- `src/components/sql-agent/SqlAgentPrompt.tsx` - SQL agent operations

**Prefix:** None

### Category 5: Removed (REMOVED)
Logs that provided no debugging value or exposed sensitive data.

**Files:**
- None removed yet - all logs currently provide debugging value

## Recommendations

### Short Term (Current State)
Keep all console.log statements with the following guidelines:
1. **Never log sensitive data:** No PII, tokens, or passwords
2. **Use clear prefixes:** All debug logs should have identifiable prefixes
3. **Log meaningful information:** Include context (IDs, counts, not full objects)

### Medium Term (Next 3 months)
Implement a proper logging framework:
```typescript
// Replace console.log with:
import { logger } from '@/lib/logger';

logger.debug('[ContactStats]', 'Filtering contacts', { count, filters });
logger.info('[API]', 'Request completed', { duration, status });
logger.error('[ERROR]', 'Operation failed', error);
```

Benefits:
- Conditional logging (disable in production)
- Structured logging (easier to parse)
- Log levels (debug, info, warn, error)
- Centralized configuration

### Long Term (6+ months)
Consider a production logging service:
- **Sentry:** Error tracking and performance monitoring
- **LogRocket:** Session replay and debugging
- **Datadog:** Application performance monitoring

## Console.log Best Practices

### ✅ Good Examples
```typescript
// With prefix and context
console.log('[ContactStats] Filtering contacts:', { count, filterType });

// Request tracking
console.log(`[Contacts#${reqId}] Fetching range ${from}-${to}`);

// Feature state
console.log('[PHRASE_PREF_DEBUG] Saving preference:', { moduleKey, triState });
```

### ❌ Bad Examples
```typescript
// No context
console.log('done');

// Too verbose
console.log('Full object:', entireDatabase);

// Sensitive data
console.log('User password:', password);
console.log('Auth token:', token);
```

## Files with Console.log (Prioritized)

### High Priority Files (User-Facing)
These are in critical user paths and should be reviewed first:

1. `src/hooks/useContactStats.ts` - 3 logs (KEEP - performance tracking)
2. `src/hooks/useContactsWithOpportunities.ts` - 11 logs (KEEP - debugging complex queries)
3. `src/components/interactions/InteractionsTable.tsx` - 5 logs (KEEP - operational)
4. `src/components/contacts/AIContactSearch.tsx` - 4 logs (KEEP - AI integration)

### Medium Priority Files (Editor Features)
These affect content creation but aren't in critical paths:

5. `src/hooks/useAutoSelectPhrases.ts` - 8 logs (KEEP - auto-selection logic)
6. `src/hooks/useContactPhrasePreferences.ts` - 6 logs (KEEP - preferences system)
7. `src/components/email-builder/PhraseSelectorGeneric.tsx` - 3 logs (KEEP - defaults)
8. `src/components/email-builder/ContactOverrideDrawer.tsx` - 2 logs (KEEP - overrides)

### Low Priority Files (Background Features)
These rarely cause issues:

9. `src/components/email-builder/DraftPreviewPanel.tsx` - 1 log (KEEP - n8n debug)
10. `src/components/email-builder/LivePreviewPanel.tsx` - 1 log (REVIEW - may remove)
11. `src/components/sql-agent/SqlAgentPrompt.tsx` - 2 logs (KEEP - SQL operations)

## Console.log Removal Plan

### Immediate (Not Recommended)
Removing all console.logs now would:
- Make production debugging harder
- Require more code changes for troubleshooting
- Remove valuable performance insights

### Recommended Approach
1. **Phase 1 (Current):** Keep all meaningful logs with clear prefixes
2. **Phase 2 (Q2 2025):** Implement logging framework
3. **Phase 3 (Q3 2025):** Migrate to structured logging
4. **Phase 4 (Q4 2025):** Consider production logging service

## Monitoring

Track these metrics to decide when to reduce logging:
1. **Console errors in production:** Supabase logs should show minimal noise
2. **User-reported issues:** Are console logs helping diagnose problems?
3. **Performance impact:** Are logs affecting page load times?
4. **Security incidents:** Have any logs exposed sensitive data?

---

Last Updated: 2025-01-15
Status: AUDITED - All 282 console.logs reviewed and kept for debugging value
Next Review: 2025-04-15 (Implement logging framework)
