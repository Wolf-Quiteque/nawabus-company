import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function getServerSupabase() {
  const cookieStore = await cookies();

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            if (typeof window !== 'undefined') {
              // Clear all cookies
              document.cookie.split(";").forEach(cookie => {
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
              });
              // Clear localStorage
              localStorage.clear();
              // Reload the page
              window.location.reload();
            }
          }
        });
      },
    },
  });
}

/**
 * Ensures a session exists. Redirects to /login if not authenticated.
 * Returns the server supabase client and user if authenticated.
 */
export async function requireSession() {
  const supabase = await getServerSupabase();
  if (!supabase) {
    redirect('/login');
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return { supabase, user };
}

/**
 * Ensures the current user has a company_id (is a company employee).
 * Redirects if user has no company or if not authenticated.
 * Returns { supabase, user, profile } on success.
 */
export async function requireCompanyUser() {
  const { supabase, user } = await requireSession();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, company_id, first_name, last_name')
    .eq('id', user.id)
    .single();

  if (error || !profile?.company_id) {
    redirect('/login?error=no_company_access');
  }

  return { supabase, user, profile };
}
