export type MissingCandidate = {
  id: string;
  full_name: string;
  email: string;
  organization: string;   // domain or org guess
  status: 'pending' | 'approved' | 'dismissed';
  created_at: string | null; // ISO
};

// A defensive mapper that tolerates different column names / nulls
export function mapRowToCandidate(r: any): MissingCandidate {
  const email =
    r?.email ??
    r?.email_address ??
    '';

  const fullName =
    r?.full_name ??
    r?.name ??
    r?.contact_name ??
    '';

  const organization =
    r?.organization ??
    r?.org ??
    r?.company ??
    r?.domain ??
    (typeof email === 'string' && email.includes('@') ? email.split('@')[1] : '');

  const status =
    (r?.status ?? r?.state ?? 'pending').toLowerCase();

  const createdAt =
    r?.created_at ??
    r?.inserted_at ??
    r?.discovered_at ??
    null;

  return {
    id: String(r?.id ?? crypto.randomUUID()),
    full_name: String(fullName || '').trim(),
    email: String(email || '').trim(),
    organization: String(organization || '').trim(),
    status: (status === 'approved' || status === 'dismissed') ? status : 'pending',
    created_at: createdAt ? new Date(createdAt).toISOString() : null,
  };
}