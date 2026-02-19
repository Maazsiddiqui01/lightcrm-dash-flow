/**
 * Default Module Configuration
 * Centralized constants for email builder modules
 */

import type { ModuleStates } from '@/components/email-builder/ModulesCard';

/**
 * Default module order for email composition
 * This order is used when no custom order is specified
 */
export const DEFAULT_MODULE_ORDER: Array<keyof ModuleStates> = [
  'subject_line',
  'initial_greeting',
  'self_personalization',
  'article_recommendations',
  'top_opportunities',
  'platforms',
  'suggested_talking_points',
  'addons',
  'general_org_update',
  'meeting_request',
  'closing_line',
] as const;

/**
 * Default module states (always/sometimes/never)
 */
export const DEFAULT_MODULE_STATES: ModuleStates = {
  subject_line: 'always',
  initial_greeting: 'always',
  self_personalization: 'always',
  article_recommendations: 'never',
  top_opportunities: 'always',
  platforms: 'always',
  suggested_talking_points: 'always',
  addons: 'always',
  general_org_update: 'always',
  meeting_request: 'always',
  closing_line: 'always',
};
