

# Fix Email Builder: Module Defaults, Article Recommendations & Subject Line Preview

## Issues to Fix

### 1. Article Recommendations defaults to "Always" instead of "Never"
The `getModuleDefaultsFromMaster()` function in `ModulesCard.tsx` (line 83-95) hardcodes ALL modules to `'always'`, overriding the intended defaults. This means article_recommendations shows as "Always" even though it should be "Never".

**Fix**: Update `getModuleDefaultsFromMaster()` to set `article_recommendations` to `'never'` (and hide it from the module list entirely).

### 2. Remove Article Recommendations from the module list entirely
Since article recommendations are disabled and excluded from payloads, the module should be hidden from the UI to avoid confusion.

**Fix**: Filter out `article_recommendations` from the module order in `ModulesCard.tsx` rendering, the `DEFAULT_MODULE_ORDER`, and the Live Preview. Also remove it from the payload construction in `enhancedPayload.ts`.

### 3. Subject Line shows twice in Live Preview
In `ModuleContentPreview.tsx`, there's a dedicated Subject Line preview block at the top (lines 148-219), but `subject_line` also appears in the `visibleModules` list as module #1. This causes it to render twice.

**Fix**: Exclude `subject_line` from the `visibleModules` loop since it already has its own dedicated preview section.

### 4. "2026 Pipeline" subject line not persisting after add
The user added "2026 Pipeline" as a new subject phrase but it doesn't appear in the list after saving. This is likely a query invalidation issue -- after creating a phrase, the phrase list query needs to be refreshed. The `useCreatePhrase` hook should already handle this, but we'll verify and ensure the subject list refreshes.

## Technical Changes

| File | Change |
|------|--------|
| `src/components/email-builder/ModulesCard.tsx` | Set `article_recommendations: 'never'` in `getModuleDefaultsFromMaster()` and filter it out from the rendered module list |
| `src/config/moduleDefaults.ts` | Remove `article_recommendations` from `DEFAULT_MODULE_ORDER` |
| `src/components/email-builder/ModuleContentPreview.tsx` | (a) Exclude `subject_line` from `visibleModules` to fix duplicate, (b) exclude `article_recommendations` from preview |
| `src/config/moduleCategoryMap.ts` | Remove `article_recommendations` from `PHRASE_DRIVEN_MODULES` and `SINGLE_SELECT_MODULES` |
| `src/pages/EmailBuilder.tsx` | Remove `article_recommendations` from the initial `moduleOrder` state |

