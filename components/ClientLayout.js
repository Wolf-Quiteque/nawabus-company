"use client";
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from "lib/supabase";
import Sidebar from './Sidebar';

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      // Check if user has company_id (company employee)
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        // Not a company employee, sign out and redirect to login
        await supabase.auth.signOut();
        router.replace('/login?error=no_company_access');
      }
    };

    if (!isLoginPage) {
      checkAuth();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        await fetch('/api/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event, session }),
        });
      } catch {}
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!isLoginPage) {
          await checkAuth();
        }
        router.refresh();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [router, pathname, isLoginPage]);

  return (
    <div className="flex">
      {!isLoginPage && <Sidebar />}
      <main className={isLoginPage ? "w-full" : "flex-1 p-10"}>
        {children}
      </main>
    </div>
  );
}
