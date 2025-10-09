import { supabase } from "@/integrations/supabase/client";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

export async function importCSVInteractions(csvContent: string) {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }

  // Parse header
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  console.log('Headers:', headers);

  // Parse data rows
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    
    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      row[header] = value || null;
    });
    
    rows.push(row);
  }

  console.log(`Parsed ${rows.length} rows from CSV`);

  // Transform and insert in batches
  const batchSize = 100;
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    
    const transformedBatch = batch.map(row => {
      // Parse date
      let occurredAt = null;
      if (row.time) {
        try {
          // Handle M/D/YYYY H:MM format
          occurredAt = new Date(row.time).toISOString();
        } catch (e) {
          console.error('Failed to parse date:', row.time);
        }
      }

      // Extract valid emails from all_emails
      const emailsArr = row.all_emails
        ? row.all_emails
            .split(';')
            .map((e: string) => e.trim().toLowerCase())
            .filter((e: string) => {
              // Filter out Exchange paths and keep only valid emails
              return e && 
                     !e.includes('/o=exchangelabs') && 
                     e.includes('@');
            })
        : [];

      // Clean from_email (remove Exchange paths)
      const cleanFromEmail = row.from_email && 
                            !row.from_email.includes('/O=EXCHANGELABS')
        ? row.from_email
        : null;

      return {
        to_names: row.to_names || null,
        to_emails: row.to_emails || null,
        from_name: row.from_name || null,
        from_email: cleanFromEmail,
        cc_names: row.cc_names || null,
        cc_emails: row.cc_emails || null,
        subject: row.subject || null,
        occurred_at: occurredAt,
        source: row.source || 'Email',
        all_emails: row.all_emails || null,
        organization: row.organization || null,
        emails_arr: emailsArr.length > 0 ? emailsArr : null,
      };
    });

    const { data, error } = await supabase
      .from('emails_meetings_raw')
      .insert(transformedBatch)
      .select();

    if (error) {
      console.error(`Batch ${i / batchSize + 1} error:`, error);
      failed += batch.length;
    } else {
      inserted += data?.length || 0;
      console.log(`Batch ${i / batchSize + 1}: inserted ${data?.length} rows`);
    }
  }

  return {
    total: rows.length,
    inserted,
    failed,
  };
}
