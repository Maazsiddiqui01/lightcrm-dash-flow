/**
 * Module-to-Library Category Mapping Registry
 * Maps each Email Module to its Global Library category
 */

export const MODULE_LIBRARY_MAP = {
  initial_greeting: 'greeting',
  self_personalization: 'self_personalization',
  top_opportunities: 'top_opportunities',
  article_recommendations: 'article_recommendations',
  platforms: 'platforms',
  addons: 'addons',
  suggested_talking_points: 'talking_points',
  general_org_update: 'org_update',
  attachments: 'attachments',
  meeting_request: 'meeting_request',
  ai_backup_personalization: 'ai_backup',
} as const;

export type ModuleKey = keyof typeof MODULE_LIBRARY_MAP;
export type CategorySlug = typeof MODULE_LIBRARY_MAP[ModuleKey];

/**
 * Modules that require phrase selection from Global Library
 */
export const PHRASE_DRIVEN_MODULES: ReadonlySet<ModuleKey> = new Set([
  'initial_greeting',
  'self_personalization',
  'top_opportunities',
  'article_recommendations',
  'platforms',
  'addons',
  'suggested_talking_points',
  'general_org_update',
  'attachments',
  'meeting_request',
  'ai_backup_personalization',
]);

/**
 * Modules that enforce single-select (radio button UI)
 */
export const SINGLE_SELECT_MODULES: ReadonlySet<ModuleKey> = new Set([
  'initial_greeting',
  'self_personalization',
  'top_opportunities',
  'article_recommendations',
  'general_org_update',
  'attachments',
  'meeting_request',
  'ai_backup_personalization',
]);

/**
 * Modules that allow multi-select (checkbox UI)
 */
export const MULTI_SELECT_MODULES: ReadonlySet<ModuleKey> = new Set([
  'platforms',
  'addons',
  'suggested_talking_points',
]);

/**
 * Check if a module requires phrase selection
 */
export function isPhraseDriven(moduleKey: string): boolean {
  return PHRASE_DRIVEN_MODULES.has(moduleKey as ModuleKey);
}

/**
 * Check if a module is single-select
 */
export function isSingleSelect(moduleKey: string): boolean {
  return SINGLE_SELECT_MODULES.has(moduleKey as ModuleKey);
}

/**
 * Check if a module is multi-select
 */
export function isMultiSelect(moduleKey: string): boolean {
  return MULTI_SELECT_MODULES.has(moduleKey as ModuleKey);
}

/**
 * Get category slug for a module
 */
export function getCategoryForModule(moduleKey: string): CategorySlug | undefined {
  return MODULE_LIBRARY_MAP[moduleKey as ModuleKey];
}
