/**
 * Type definitions for Group Email Builder mode
 */

import type { ModuleSelections } from './moduleSelections';
import type { MasterTemplateDefaults } from './phraseLibrary';
import type { EnhancedDraftPayload } from '@/lib/enhancedPayload';
import type { TeamMember } from '@/components/email-builder/EditableTeam';

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
  moduleSelections?: ModuleSelections;
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

export interface BatchPayload {
  mode: 'group';
  batchId: string;
  filterParams: Record<string, any>;
  sharedSettings: {
    toneOverride?: string;
    lengthOverride?: string;
    daysSinceContact: number;
    masterTemplate: MasterTemplateDefaults;
    moduleSelections: ModuleSelections;
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
