/**
 * CC building utility for Email Builder
 */

export function buildCc(
  lgEmailsCc: string | null,
  leadEmails: string[],
  assistantEmails: string[],
  deltaType: 'Email' | 'Meeting',
  toAddress: string
): string {
  const ccSet = new Set<string>();
  
  // Start with lg_emails_cc
  if (lgEmailsCc) {
    lgEmailsCc.split(/[;,]/).forEach(email => {
      const trimmed = email.trim().toLowerCase();
      if (trimmed && isValidEmail(trimmed)) {
        ccSet.add(trimmed);
      }
    });
  }
  
  // Add lead_emails
  leadEmails.forEach(email => {
    if (email) {
      const trimmed = email.trim().toLowerCase();
      if (isValidEmail(trimmed)) {
        ccSet.add(trimmed);
      }
    }
  });
  
  // If Delta Type = Meeting, add assistant_emails
  if (deltaType === 'Meeting') {
    assistantEmails.forEach(email => {
      if (email) {
        const trimmed = email.trim().toLowerCase();
        if (isValidEmail(trimmed)) {
          ccSet.add(trimmed);
        }
      }
    });
  }
  
  // Remove the "to" address
  if (toAddress) {
    ccSet.delete(toAddress.trim().toLowerCase());
  }
  
  // Convert back to original case and join with semicolons
  const ccArray = Array.from(ccSet);
  return ccArray.join('; ');
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}