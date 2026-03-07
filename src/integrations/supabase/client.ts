import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables with hardcoded fallbacks for Lovable compatibility.
// When migrating to Azure, remove the fallback values and rely solely on env vars.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || "https://wkfypffesqcncrfsfaxt.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrZnlwZmZlc3FjbmNyZnNmYXh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4OTczMjMsImV4cCI6MjA1MjQ3MzMyM30.x-xhMiIYMaFRaIEEMBYMkGcFN3FMRqrAlqwxnKtNqlo";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
