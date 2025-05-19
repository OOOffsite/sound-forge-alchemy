import { createClient } from '@supabase/supabase-js';

// These values will be provided by the API Gateway
const getSupabaseCredentials = async () => {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/config`);
    const { supabaseUrl, supabaseAnonKey } = await response.json();
    return { supabaseUrl, supabaseAnonKey };
  } catch (error) {
    console.error('Error fetching Supabase credentials:', error);
    return {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000',
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    };
  }
};

// This function will create and return a Supabase client
export const createSupabaseClient = async () => {
  const { supabaseUrl, supabaseAnonKey } = await getSupabaseCredentials();
  return createClient(supabaseUrl, supabaseAnonKey);
};

// This function should be used to get the Supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null;

export const getSupabaseClient = async () => {
  if (!supabaseClient) {
    supabaseClient = await createSupabaseClient();
  }
  return supabaseClient;
};