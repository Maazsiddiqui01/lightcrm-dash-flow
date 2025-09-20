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