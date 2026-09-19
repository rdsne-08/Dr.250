import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

import { env } from './environment.js';

const serverAuthOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
  realtime: {
    transport: WebSocket,
  },
};

// This client is safe for user authentication operations. The anon key is not
// privileged; authorization still depends on a verified user JWT and DB role.
export const supabaseAuth = createClient(
  env.supabaseUrl,
  env.supabaseAnonKey,
  serverAuthOptions,
);

// Never export this client to browser code. It is used only for server-side
// user lifecycle operations that require the service role.
export const supabaseAdmin = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  serverAuthOptions,
);
