import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

async function getSupabaseAndCompanyId() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  // Get user profile to get company_id
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.company_id) {
    return { error: 'Company access required', status: 403 };
  }

  return { supabase, companyId: profile.company_id };
}

export async function POST(request) {
  try {
    const authResult = await getSupabaseAndCompanyId();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { supabase, companyId } = authResult;

    const body = await request.json();
    const { first_name, last_name, phone, role, password } = body;

    if (!first_name || !last_name || !phone || !role || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['admin', 'agent', 'driver'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      phone: phone,
      password: password,
    });

    if (authError) throw authError;

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        first_name,
        last_name,
        phone,
        role,
        company_id: companyId,
      })
      .select()
      .single();

    if (profileError) throw profileError;

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
