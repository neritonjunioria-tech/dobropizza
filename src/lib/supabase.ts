import { createClient } from '@supabase/supabase-js';

const fallbackUrl = 'https://yexlnjznkxthffklovql.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlleGxuanpua3h0aGZma2xvdnFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MTEwMjgsImV4cCI6MjEwNzQ4NzAyOH0.M6jNSqYTbPXuGmGMyETLR8UBA5Q4uk8NKqrSbk0Y3Cw';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || fallbackUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || fallbackKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

