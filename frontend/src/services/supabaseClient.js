import { createClient } from "@supabase/supabase-js";

// Optional Supabase browser client (used only for direct reads if needed).
// All writes / privileged operations go through the FastAPI backend.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
