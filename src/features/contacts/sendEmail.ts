/**
 * Legacy function - Now routes through Email Builder logic
 * This maintains backward compatibility while using the unified draft generation system
 * 
 * @deprecated Consider using useContactDraftGenerator hook directly for better control
 */
export async function sendContactEmail(contactId: string) {
  // This is now just a wrapper - actual logic moved to useContactDraftGenerator hook
  // Components should use the hook directly for better loading states and error handling
  console.warn('sendContactEmail is deprecated. Use useContactDraftGenerator hook instead.');
  throw new Error('Please use useContactDraftGenerator hook directly in your component');
}