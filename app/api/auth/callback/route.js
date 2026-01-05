import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { event, session } = await request.json();

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Handle auth callback
    if (event === 'SIGNED_IN' && session) {
      // Set the session cookie
      const { data, error } = await supabase.auth.setSession(session);
      if (error) throw error;
    } else if (event === 'SIGNED_OUT') {
      // Clear the session
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.json({ error: 'Auth callback failed' }, { status: 500 });
  }
}
