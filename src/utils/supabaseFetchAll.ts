/**
 * Fetches all rows from a Supabase query by paginating through results.
 * This bypasses the server-side max rows cap (often 1000) that PostgREST may enforce.
 * 
 * @param makeQuery - A factory function that creates a fresh query for each page with .range(from, to)
 * @param pageSize - Number of rows per page (default: 1000)
 * @param maxPages - Safety limit to prevent infinite loops (default: 20)
 * @returns Array of all fetched rows
 */
export async function fetchAllPaged<T>(
  makeQuery: (from: number, to: number) => { then: (onfulfilled: (result: { data: T[] | null; error: any }) => any) => any },
  pageSize: number = 1000,
  maxPages: number = 20
): Promise<T[]> {
  const allRows: T[] = [];
  let page = 0;
  
  while (page < maxPages) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error } = await makeQuery(from, to);
    
    if (error) {
      console.error('Error in fetchAllPaged:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      break;
    }
    
    allRows.push(...data);
    
    // If we got fewer rows than pageSize, we've reached the end
    if (data.length < pageSize) {
      break;
    }
    
    page++;
  }
  
  if (page >= maxPages) {
    console.warn(`fetchAllPaged: Reached max pages limit (${maxPages}). There may be more data.`);
  }
  
  return allRows;
}
