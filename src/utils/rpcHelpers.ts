import { supabase } from '@/integrations/supabase/client';

/**
 * Type-safe wrappers for RPC functions with multiple overloads.
 * These wrappers ensure all parameters are always passed explicitly to avoid ambiguity.
 * 
 * See PREVENTION_FRAMEWORK.md for more details on RPC overload safety.
 */

interface AddContactNoteParams {
  contactId: string;
  field: 'notes' | 'next_steps';
  content: string;
  dueDate?: string | null;
}

interface AddOpportunityNoteParams {
  opportunityId: string;
  field: 'next_steps' | 'most_recent_notes';
  content: string;
  dueDate?: string | null;
}

/**
 * Type-safe wrapper for add_contact_note RPC function.
 * Handles both 3-parameter and 4-parameter overloads by always passing all parameters.
 * 
 * @param params - Contact note parameters
 * @returns Supabase RPC result
 */
export const addContactNote = async (params: AddContactNoteParams) => {
  return await supabase.rpc('add_contact_note', {
    p_contact_id: params.contactId,
    p_field: params.field,
    p_content: params.content,
    p_due_date: params.dueDate ?? null, // ALWAYS pass to avoid overload ambiguity
  });
};

/**
 * Type-safe wrapper for add_opportunity_note RPC function.
 * Handles both 3-parameter and 4-parameter overloads by always passing all parameters.
 * 
 * @param params - Opportunity note parameters
 * @returns Supabase RPC result
 */
export const addOpportunityNote = async (params: AddOpportunityNoteParams) => {
  return await supabase.rpc('add_opportunity_note', {
    p_opportunity_id: params.opportunityId,
    p_field: params.field,
    p_content: params.content,
    p_due_date: params.dueDate ?? null, // ALWAYS pass to avoid overload ambiguity
  });
};

interface AddHorizonNoteParams {
  recordId: string;
  recordType: 'company' | 'gp';
  field: 'notes' | 'next_steps';
  content: string;
  dueDate?: string | null;
}

/**
 * Type-safe wrapper for add_horizon_note RPC function.
 * Adds notes/next steps to horizon companies or GPs with timeline tracking.
 * 
 * @param params - Horizon note parameters
 * @returns Supabase RPC result
 */
export const addHorizonNote = async (params: AddHorizonNoteParams) => {
  return await supabase.rpc('add_horizon_note', {
    p_record_id: params.recordId,
    p_record_type: params.recordType,
    p_field: params.field,
    p_content: params.content,
    p_due_date: params.dueDate ?? null,
  });
};
