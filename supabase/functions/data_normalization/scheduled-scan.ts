// Scheduled duplicate scan handler
export async function scheduledDuplicateScan(supabase: any, scanType: string = 'fuzzy') {
  console.log(`Starting scheduled ${scanType} duplicate scan...`);
  
  const runId = crypto.randomUUID();
  
  try {
    // Create detection run record
    await supabase
      .from('duplicate_detection_runs')
      .insert({
        id: runId,
        run_type: 'scheduled',
        started_at: new Date().toISOString(),
        status: 'running',
      });

    let duplicatesFound = 0;

    if (scanType === 'exact') {
      // Quick exact email match scan
      const { data: exactMatches } = await supabase
        .from('contacts_raw')
        .select('email_address, id, full_name, assigned_to, created_by')
        .not('email_address', 'is', null);

      const emailGroups = new Map<string, any[]>();
      for (const contact of exactMatches || []) {
        const email = contact.email_address.toLowerCase().trim();
        if (!emailGroups.has(email)) emailGroups.set(email, []);
        emailGroups.get(email)!.push(contact);
      }

      // Process duplicates
      for (const [email, contacts] of emailGroups.entries()) {
        if (contacts.length > 1) {
          duplicatesFound += contacts.length;

          // Check if duplicate record exists
          const { data: existing } = await supabase
            .from('contact_duplicates')
            .select('id')
            .eq('email_address', email)
            .eq('status', 'active')
            .maybeSingle();

          if (!existing) {
            // Create duplicate record
            await supabase
              .from('contact_duplicates')
              .insert({
                email_address: email,
                user_count: contacts.length,
                status: 'active',
                first_detected_at: new Date().toISOString(),
                last_updated_at: new Date().toISOString(),
              });

            // Create notifications for high-confidence matches (exact email = 100%)
            for (const contact of contacts) {
              const userId = contact.assigned_to || contact.created_by;
              if (userId) {
                await supabase
                  .from('contact_notifications')
                  .insert({
                    user_id: userId,
                    notification_type: 'duplicate_detected',
                    title: 'Duplicate Contact Detected',
                    message: `Contact "${contact.full_name}" has duplicate entries (exact email match)`,
                    read: false,
                    contact_id: contact.id,
                  });
              }
            }
          }
        }
      }
    } else if (scanType === 'fuzzy') {
      // Full fuzzy scan - this will be more comprehensive but slower
      // For scheduled scans, we can process in batches
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: contactBatch, error } = await supabase
          .from('contacts_raw')
          .select('id, full_name, email_address, organization')
          .not('email_address', 'is', null)
          .not('full_name', 'is', null)
          .range(offset, offset + batchSize - 1);

        if (error || !contactBatch || contactBatch.length === 0) {
          hasMore = false;
          break;
        }

        // Process this batch (simplified fuzzy logic for background job)
        const domainGroups = new Map<string, any[]>();
        for (const contact of contactBatch) {
          const domain = contact.email_address.split('@')[1]?.toLowerCase();
          if (domain) {
            if (!domainGroups.has(domain)) domainGroups.set(domain, []);
            domainGroups.get(domain)!.push(contact);
          }
        }

        // Within each domain, check for fuzzy name matches
        for (const [domain, contacts] of domainGroups.entries()) {
          if (contacts.length > 1) {
            // Compare contacts within same domain
            for (let i = 0; i < contacts.length; i++) {
              for (let j = i + 1; j < contacts.length; j++) {
                const similarity = calculateNameSimilarity(
                  contacts[i].full_name,
                  contacts[j].full_name
                );

                // Only report high-confidence fuzzy matches (>85%)
                if (similarity >= 85) {
                  duplicatesFound += 2;
                  
                  // Store in contact_duplicates for user review
                  const email = contacts[i].email_address.toLowerCase();
                  await supabase
                    .from('contact_duplicates')
                    .upsert({
                      email_address: email,
                      user_count: 2,
                      status: 'active',
                      first_detected_at: new Date().toISOString(),
                      last_updated_at: new Date().toISOString(),
                    }, {
                      onConflict: 'email_address',
                    });
                }
              }
            }
          }
        }

        offset += batchSize;
        hasMore = contactBatch.length === batchSize;
      }
    }

    // Mark run as completed
    await supabase
      .from('duplicate_detection_runs')
      .update({
        completed_at: new Date().toISOString(),
        duplicates_found: duplicatesFound,
        status: 'completed',
      })
      .eq('id', runId);

    console.log(`Scheduled ${scanType} scan completed: ${duplicatesFound} duplicates found`);

    return new Response(
      JSON.stringify({
        success: true,
        duplicatesFound,
        scanType,
        runId,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Scheduled scan error:', error);

    // Mark run as failed
    await supabase
      .from('duplicate_detection_runs')
      .update({
        completed_at: new Date().toISOString(),
        status: 'failed',
        error_message: error.message,
      })
      .eq('id', runId);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Helper function for name similarity (simple version for background jobs)
function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  if (n1 === n2) return 100;
  
  // Simple character-based similarity
  const longer = n1.length > n2.length ? n1 : n2;
  const shorter = n1.length > n2.length ? n2 : n1;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  
  return Math.round((matches / longer.length) * 100);
}
