import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
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

  if (profile.role !== 'admin') {
    return { error: 'Only company admins can add employees', status: 403 };
  }

  return { supabase, companyId: profile.company_id };
}

export async function POST(request) {
  try {
    const authResult = await getSupabaseAndCompanyId();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { companyId } = authResult;

    const body = await request.json();
    const { first_name, last_name, phone, role, password } = body;

    if (!first_name || !last_name || !phone || !role || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // The admin role is global across every company on the platform, so a
    // company must not be able to mint one here. Admins are created in
    // admin-app by the platform's own administrators.
    if (!['agent', 'driver'].includes(role)) {
      return NextResponse.json({ error: 'Cargo inválido: use Agente ou Motorista.' }, { status: 400 });
    }

    // Employee accounts use the same email+password login convention as the rest
    // of the platform (phone number is aliased to an @nawabus.com email).
    const email = `${phone}@nawabus.com`;

    // Service-role client: creates the auth user without touching the caller's
    // own session (auth.signUp with the anon client would sign the caller out).
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, role, company_id: companyId },
    });

    if (authError) throw authError;

    // The signup trigger has already created a passenger profile for this
    // account, so this must be an upsert: a plain insert collided with it and
    // every employee creation failed (the new account was then deleted).
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        first_name,
        last_name,
        phone_number: phone,
        role,
        company_id: companyId,
      })
      .select()
      .single();

    if (profileError) {
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
