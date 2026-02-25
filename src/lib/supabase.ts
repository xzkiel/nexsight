import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured');
}

// Lazy singleton — only created in the browser to avoid SSR WebSocket issues
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (!_supabase) {
        _supabase = createClient(supabaseUrl, supabaseAnonKey, {
            realtime: {
                params: {
                    eventsPerSecond: 10,
                },
            },
        });
        console.log('Supabase client created');
    }
    return _supabase;
}

// For backward compatibility — creates eagerly only in browser
export const supabase: SupabaseClient =
    typeof window !== 'undefined'
        ? getSupabase()
        : (new Proxy({}, {
            get(_, prop) {
                // Return no-op stubs during SSR to prevent crashes
                if (prop === 'channel') return () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) });
                if (prop === 'removeChannel') return () => {};
                return () => {};
            },
        }) as unknown as SupabaseClient);
