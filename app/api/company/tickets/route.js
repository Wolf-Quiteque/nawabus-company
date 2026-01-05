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

export async function GET(request) {
  try {
    const authResult = await getSupabaseAndCompanyId();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { supabase, companyId } = authResult;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const offset = (page - 1) * limit;

    // First get company trips to filter tickets
    const { data: companyTrips, error: tripsError } = await supabase
      .from('trips')
      .select('id')
      .eq('company_id', companyId);

    if (tripsError) throw tripsError;

    const tripIds = companyTrips.map(trip => trip.id);

    if (tripIds.length === 0) {
      return NextResponse.json({
        tickets: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      });
    }

    let query = supabase
      .from('tickets')
      .select(`
        id,
        seat_number,
        price_paid_usd,
        payment_status,
        status,
        created_at,
        passenger:passenger_id(
          id,
          first_name,
          last_name,
          phone
        ),
        trip:trip_id(
          id,
          departure_time,
          arrival_time,
          route:route_id(
            id,
            origin,
            destination
          )
        )
      `)
      .in('trip_id', tripIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    const { data: tickets, error: ticketsError } = await query;

    if (ticketsError) throw ticketsError;

    // Get total count
    let countQuery = supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .in('trip_id', tripIds);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count, error: countError } = await countQuery;

    if (countError) throw countError;

    return NextResponse.json({
      tickets: tickets || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}
