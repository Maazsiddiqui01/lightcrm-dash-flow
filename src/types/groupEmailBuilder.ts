/**
 * Type definitions for Group Email Builder mode
 */

import type { ModuleSelections } from './moduleSelections';
import type { MasterTemplateDefaults } from './phraseLibrary';
import type { EnhancedDraftPayload } from '@/lib/enhancedPayload';
import type { TeamMember } from '@/components/email-builder/EditableTeam';
import type { TriState } from '@/types/phraseLibrary';

export interface GroupModeState {
  selectedContactIds: Set<string>;
  overrides: Map<string, ContactOverride>;
  queueStatus: Map<string, QueueItem>;
}

export interface ContactOverride {
  contactId: string;
  recipients?: {
    to: string;
    cc: string[];
  };
  masterTemplate?: {
    id: string;
    key: string;
    name: string;
  };
  coreSettings?: {
    tone?: 'casual' | 'hybrid' | 'formal';
    length?: 'brief' | 'standard' | 'detailed';
    daysSince?: number;
  };
  moduleSelections?: ModuleSelections;
  moduleOrder?: Array<string>; // Module order override support
  moduleStates?: Record<string, TriState>; // Module states override support
  subjectLinePool?: {
    selectedIds: string[];
    style: 'formal' | 'hybrid' | 'casual';
  };
  team?: TeamMember[];
}

export interface QueueItem {
  contactId: string;
  contactName: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  progress: number;
  error?: string;
  retryCount: number;
  result?: {
    subject: string;
    body: string;
    greeting: string;
    signature: string;
    ccList: string[];
  };
}

export interface CohortSelection {
  cohortSnapshotId: string;
  includeAll: boolean;
  excludedIds: string[];
  explicitIds: string[];
}

export interface BatchPayload {
  mode: 'group';
  batchId: string;
  cohortSnapshotId?: string;
  selection?: CohortSelection;
  filterParams: Record<string, any>;
  sharedSettings: {
    toneOverride?: string;
    lengthOverride?: string;
    daysSinceContact: number;
    masterTemplate: MasterTemplateDefaults;
    moduleSelections: ModuleSelections;
    moduleOrder?: Array<any>;
    moduleStates?: Record<string, any>;
    subjectLinePool: {
      selectedIds: string[];
      style: 'formal' | 'hybrid' | 'casual';
    };
  };
  items: Array<{
    contactId: string;
    payload: EnhancedDraftPayload;
  }>;
  meta: {
    client: string;
    version: string;
    timestamp: string;
  };
}

export interface FilterValues {
  focusAreas?: string[];
  sectors?: string[];
  areasOfSpecialization?: string[];
  organizations?: string[];
  titles?: string[];
  categories?: string[];
  deltaType?: string[];
  hasOpportunities?: string[];
  mostRecentContactStart?: string;
  mostRecentContactEnd?: string;
  deltaMin?: number;
  deltaMax?: number;
  lgLead?: string[];
  groupContacts?: string[];
}

export interface EffectiveConfig {
  masterTemplate: MasterTemplateDefaults;
  coreSettings: {
    tone: string;
    length: string;
    daysSince: number;
  };
  subjectLinePool: {
    selectedIds: string[];
    style: 'formal' | 'hybrid' | 'casual';
  };
  moduleSelections: ModuleSelections;
  moduleOrder: Array<keyof ModuleSelections>;
  moduleStates: Record<string, TriState>;
  team: TeamMember[];
  recipients: {
    to: string;
    cc: string[];
  };
  contactInfo: {
    organization: string;
    focusAreas: string[];
    topOpps: any[];
  };
}
