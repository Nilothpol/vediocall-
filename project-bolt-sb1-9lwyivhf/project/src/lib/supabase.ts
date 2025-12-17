import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface User {
  id: string;
  username: string;
  is_online: boolean;
  created_at: string;
  last_seen: string;
}

export interface CallSession {
  id: string;
  caller_id: string;
  receiver_id: string;
  status: 'pending' | 'active' | 'ended';
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface SignalingMessage {
  id: string;
  session_id: string;
  from_user_id: string;
  to_user_id: string;
  message_type: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
  created_at: string;
}
