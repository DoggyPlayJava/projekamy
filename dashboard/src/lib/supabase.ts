import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://adqhtjzbzeyiuzvdujnf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkcWh0anpiemV5aXV6dmR1am5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNjg4MTAsImV4cCI6MjEwNTc0NDgxMH0.APe7LZp9h9waNWZYYdu-fYt1kvgmFNGCozBYE1nG3bc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
