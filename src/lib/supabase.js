import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log("URL:", SUPABASE_URL);
console.log("KEY:", SUPABASE_ANON_KEY);

export const STORAGE_BUCKET = process.env.REACT_APP_STORAGE_BUCKET || "sejalan-photos";

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        realtime: { params: { eventsPerSecond: 5 } },
      })
    : null;

export const isSupabaseReady = () => !!supabase;
