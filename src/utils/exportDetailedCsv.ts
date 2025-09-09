// utils/exportDetailedCsv.ts
import { supabase } from '@/integrations/supabase/client';
import { formatISO } from 'date-fns';

// Tiny CSV
function toCsv(rows: Record<string, any>[]): string {
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = Object.keys(rows[0] ?? {});
  const head = headers.map(esc).join(',');
  const body = rows.map(r => headers.map(h => esc(r[h])).join(',')).join('\n');
  return [head, body].join('\n');
}

// Normalize for name matching (mirrors normalize_name())
const normalize = (s?: string | null) =>
  (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

// Chunk helper for large IN lists
function chunk<T>(arr: T[], size = 500): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

type ContactBase = {
  id: string;
  full_name: string | null;
  email_address: string | null;
  organization: string | null;
  title: string | null;
  areas_of_specialization: string | null;
  lg_focus_areas_comprehensive_list: string | null;
  lg_focus_area_1: string | null;
  lg_focus_area_2: string | null;
  lg_focus_area_3: string | null;
  lg_focus_area_4: string | null;
  lg_focus_area_5: string | null;
  lg_focus_area_6: string | null;
  lg_focus_area_7: string | null;
  lg_focus_area_8: string | null;
  lg_sector: string | null;
  delta_type: string | null;
  delta: string | number | null;
  of_emails?: number | null;          // if present in contacts_app we'll backfill later
  of_meetings?: number | null;
  most_recent_contact?: string | null;
  next_scheduled_outreach_date?: string | null;
  notes: string | null;
};

// -------------- MAIN EXPORT --------------
export async function exportContactsDetailedCSV(filteredContactIds: string[]) {
  if (!filteredContactIds?.length) {
    throw new Error('No contacts selected for export');
  }

  // 1) Fetch base rows from contacts_raw (we want raw drawer fields)
  const contactChunks = chunk(filteredContactIds, 500);
  const contacts: ContactBase[] = [];
  for (const ids of contactChunks) {
    const { data, error } = await supabase
      .from('contacts_raw')
      .select(`
        id, full_name, email_address, organization, title,
        areas_of_specialization, lg_focus_areas_comprehensive_list,
        lg_focus_area_1, lg_focus_area_2, lg_focus_area_3, lg_focus_area_4,
        lg_focus_area_5, lg_focus_area_6, lg_focus_area_7, lg_focus_area_8,
        lg_sector, delta_type, delta, notes
      `)
      .in('id', ids);

    if (error) throw error;
    contacts.push(...(data ?? []));
  }

  // 2) Build email + normalized name sets for joins
  const emails = contacts
    .map(c => (c.email_address ?? '').toLowerCase().trim())
    .filter(Boolean);
  const namesNorm = contacts
    .map(c => [c.id, normalize(c.full_name)])
    .filter(([, n]) => !!n) as [string, string][];

  // 3) Latest interaction per email (fast window fn via PostgREST RPC isn't available here, so do a grouped query + reduce client-side)
  //    Grab last 12 months to keep payload reasonable; remove the filter if you truly need "ever".
  const emailsChunks = chunk([...new Set(emails)], 500);
  type InteractionRow = { email: string | null; occurred_at: string | null; subject: string | null };
  const interactions: InteractionRow[] = [];
  for (const ems of emailsChunks) {
    const { data, error } = await supabase
      .from('interactions_flat')
      .select('email, occurred_at, subject')
      .in('email', ems)
      .order('occurred_at', { ascending: false })
      .limit(5000);
    if (error) throw error;
    interactions.push(...(data ?? []));
  }
  // reduce to latest per email
  const latestByEmail = new Map<string, InteractionRow>();
  for (const r of interactions) {
    const key = (r.email ?? '').toLowerCase();
    if (!key) continue;
    if (!latestByEmail.has(key)) latestByEmail.set(key, r);
  }

  // 4) Opportunities (as Deal Source) – fetch likely rows then strict-match by normalized name
  //    We can't OR ilike for each name efficiently, so fetch a reasonable slice and filter client-side.
  //    If your table is small (<10k) you can remove the limit. Otherwise use a narrower date filter if possible.
  const { data: oppRows, error: oppErr } = await supabase
    .from('opportunities_raw')
    .select('deal_name, deal_source_individual_1, deal_source_individual_2')
    .limit(20000); // tune as needed
  if (oppErr) throw oppErr;

  // Map contact.id -> comma-joined unique deal list
  const oppsByContactId = new Map<string, string>();
  const oppCache = new Map<string, string[]>(); // normName -> deal list
  for (const [cid, normName] of namesNorm) {
    if (!oppCache.has(normName)) {
      const seen = new Set<string>();
      const list: string[] = [];
      for (const o of oppRows ?? []) {
        const m1 = normalize(o.deal_source_individual_1) === normName;
        const m2 = normalize(o.deal_source_individual_2) === normName;
        if (!m1 && !m2) continue;
        const nm = (o.deal_name ?? '').trim();
        if (!nm) continue;
        const key = nm.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          list.push(nm);
          if (list.length >= 200) break; // safety; absurdly large lists aren't useful in CSV
        }
      }
      oppCache.set(normName, list);
    }
    oppsByContactId.set(cid, (oppCache.get(normName) ?? []).join(', '));
  }

  // 5) Compose CSV rows
  const headers = [
    'Full Name', 'Email', 'Organization', 'Title',
    'Areas of Specialization', 'LG Focus Areas (Comprehensive)',
    'LG Focus Area 1', 'LG Focus Area 2', 'LG Focus Area 3', 'LG Focus Area 4',
    'LG Focus Area 5', 'LG Focus Area 6', 'LG Focus Area 7', 'LG Focus Area 8',
    'LG Sector', 'Delta Type', 'Delta',
    'Emails', 'Meetings', 'Most Recent Contact', 'Next Scheduled Outreach Date',
    'Recent Interaction At', 'Recent Interaction Subject',
    'Opportunities (as Deal Source)', 'Notes'
  ];

  const rows = contacts.map(c => {
    const email = (c.email_address ?? '').toLowerCase();
    const last = latestByEmail.get(email);
    return {
      'Full Name': c.full_name ?? '',
      'Email': c.email_address ?? '',
      'Organization': c.organization ?? '',
      'Title': c.title ?? '',
      'Areas of Specialization': c.areas_of_specialization ?? '',
      'LG Focus Areas (Comprehensive)': c.lg_focus_areas_comprehensive_list ?? '',
      'LG Focus Area 1': c.lg_focus_area_1 ?? '',
      'LG Focus Area 2': c.lg_focus_area_2 ?? '',
      'LG Focus Area 3': c.lg_focus_area_3 ?? '',
      'LG Focus Area 4': c.lg_focus_area_4 ?? '',
      'LG Focus Area 5': c.lg_focus_area_5 ?? '',
      'LG Focus Area 6': c.lg_focus_area_6 ?? '',
      'LG Focus Area 7': c.lg_focus_area_7 ?? '',
      'LG Focus Area 8': c.lg_focus_area_8 ?? '',
      'LG Sector': c.lg_sector ?? '',
      'Delta Type': c.delta_type ?? '',
      'Delta': c.delta ?? '',
      'Emails': c.of_emails ?? '',                    // often only in contacts_app; blank if not present
      'Meetings': c.of_meetings ?? '',
      'Most Recent Contact': c.most_recent_contact ?? '',
      'Next Scheduled Outreach Date': c.next_scheduled_outreach_date ?? '',
      'Recent Interaction At': last?.occurred_at ? formatISO(new Date(last.occurred_at)) : '',
      'Recent Interaction Subject': last?.subject ?? '',
      'Opportunities (as Deal Source)': oppsByContactId.get(c.id) ?? '',
      'Notes': c.notes ?? '',
    } as Record<string, any>;
  });

  const csv = rows.length ? toCsv([Object.fromEntries(headers.map(h => [h, h])), ...rows]) : toCsv([]);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `contacts-detailed-${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
