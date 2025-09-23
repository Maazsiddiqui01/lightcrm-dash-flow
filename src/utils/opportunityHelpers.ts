// Utility functions for opportunity handling

export const calculateLgTeam = (
  lead1?: string | null,
  lead2?: string | null, 
  lead3?: string | null,
  lead4?: string | null
): string => {
  const leads = [lead1, lead2, lead3, lead4]
    .filter(lead => lead && lead.trim() !== '')
    .map(lead => lead!.trim());
  
  return leads.join(', ');
};

export const updateLgTeamInDatabase = async (
  supabase: any,
  opportunityId: string,
  lead1?: string | null,
  lead2?: string | null,
  lead3?: string | null,
  lead4?: string | null
) => {
  const lgTeam = calculateLgTeam(lead1, lead2, lead3, lead4);
  
  const { error } = await supabase
    .from('opportunities_raw')
    .update({ lg_team: lgTeam })
    .eq('id', opportunityId);
    
  return { error };
};

// Fields that trigger auto-calculation of derived fields
const LG_TEAM_TRIGGER_FIELDS = [
  'investment_professional_point_person_1',
  'investment_professional_point_person_2', 
  'investment_professional_point_person_3',
  'investment_professional_point_person_4'
];

export const isLgTeamTriggerField = (columnKey: string): boolean => {
  return LG_TEAM_TRIGGER_FIELDS.includes(columnKey);
};

export const calculateDerivedFields = (
  tableName: string,
  columnKey: string, 
  currentRowData: any,
  editedRowData: any
): Record<string, any> => {
  const derivedFields: Record<string, any> = {};

  // Only calculate for opportunities table and LG team trigger fields
  if (tableName === 'opportunities_raw' && isLgTeamTriggerField(columnKey)) {
    // Get the current values (original + any pending edits)
    const mergedData = { ...currentRowData, ...editedRowData };
    
    const lgTeam = calculateLgTeam(
      mergedData.investment_professional_point_person_1,
      mergedData.investment_professional_point_person_2,
      mergedData.investment_professional_point_person_3,
      mergedData.investment_professional_point_person_4
    );
    
    derivedFields.lg_team = lgTeam;
  }

  return derivedFields;
};