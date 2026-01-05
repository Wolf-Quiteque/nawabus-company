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

    let query = supabase
      .from('trips')
      .select(`
        id,
        departure_time,
        arrival_time,
        price_usd,
        status,
        created_at,
        route:route_id(
          id,
          origin_city,
          origin_province,
          destination_city,
          destination_province
        ),
        bus:bus_id(
          id,
          license_plate,
          make,
          model
        ),
        driver:driver_id(
          id,
          first_name,
          last_name
        ),
        tickets(count)
      `)
      .eq('company_id', companyId)
      .order('departure_time', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    const { data: trips, error: tripsError } = await query;

    if (tripsError) throw tripsError;

    // Get total count for pagination
    let countQuery = supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count, error: countError } = await countQuery;

    if (countError) throw countError;

    return NextResponse.json({
      trips: trips || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authResult = await getSupabaseAndCompanyId();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { supabase, companyId } = authResult;

    const body = await request.json();
    const { route_id, bus_id, driver_id, departure_time, arrival_time, price } = body;

    if (!route_id || !bus_id || !driver_id || !departure_time || !arrival_time || !price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify ownership of route, bus, driver
    const [routeCheck, busCheck, driverCheck] = await Promise.all([
      supabase.from('routes').select('id').eq('id', route_id).eq('company_id', companyId).single(),
      supabase.from('buses').select('id').eq('id', bus_id).eq('company_id', companyId).single(),
      supabase.from('profiles').select('id').eq('id', driver_id).eq('company_id', companyId).eq('role', 'driver').single()
    ]);

    if (routeCheck.error || busCheck.error || driverCheck.error) {
      return NextResponse.json({ error: 'Invalid route, bus, or driver' }, { status: 400 });
    }

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        route_id,
        bus_id,
        driver_id,
        departure_time,
        arrival_time,
        price_usd: parseFloat(price),
        company_id: companyId,
        status: 'scheduled'
      })
      .select()
      .single();

    if (tripError) throw tripError;

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error('Error creating trip:', error);
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const authResult = await getSupabaseAndCompanyId();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { supabase, companyId } = authResult;

    const body = await request.json();
    const { id, route_id, bus_id, driver_id, departure_time, arrival_time, price, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    // Check ownership
    const { data: existingTrip, error: checkError } = await supabase
      .from('trips')
      .select('id')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (checkError || !existingTrip) {
      return NextResponse.json({ error: 'Trip not found or access denied' }, { status: 404 });
    }

    const updateData = {};
    if (route_id !== undefined) updateData.route_id = route_id;
    if (bus_id !== undefined) updateData.bus_id = bus_id;
    if (driver_id !== undefined) updateData.driver_id = driver_id;
    if (departure_time !== undefined) updateData.departure_time = departure_time;
    if (arrival_time !== undefined) updateData.arrival_time = arrival_time;
    if (price !== undefined) updateData.price_usd = parseFloat(price);
    if (status !== undefined) updateData.status = status;

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (tripError) throw tripError;

    return NextResponse.json(trip);
  } catch (error) {
    console.error('Error updating trip:', error);
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authResult = await getSupabaseAndCompanyId();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { supabase, companyId } = authResult;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    // Check ownership and delete
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (tripError) {
      if (tripError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Trip not found or access denied' }, { status: 404 });
      }
      throw tripError;
    }

    return NextResponse.json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 });
  }
}
