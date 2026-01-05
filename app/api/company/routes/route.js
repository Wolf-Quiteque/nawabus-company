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
    const isActive = searchParams.get('is_active');

    const offset = (page - 1) * limit;

    let query = supabase
      .from('routes')
      .select(`
        id,
        origin_city,
        origin_province,
        destination_city,
        destination_province,
        distance_km,
        estimated_duration_hours,
        base_price_usd,
        is_active,
        created_at,
        trips(count)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (search) {
      query = query.or(`origin_city.ilike.%${search}%,destination_city.ilike.%${search}%`);
    }

    if (isActive !== null && isActive !== '') {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: routes, error: routesError } = await query;

    if (routesError) throw routesError;

    // Get total count for pagination
    let countQuery = supabase
      .from('routes')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (search) {
      countQuery = countQuery.or(`origin_city.ilike.%${search}%,destination_city.ilike.%${search}%`);
    }

    if (isActive !== null && isActive !== '') {
      countQuery = countQuery.eq('is_active', isActive === 'true');
    }

    const { count, error: countError } = await countQuery;

    if (countError) throw countError;

    return NextResponse.json({
      routes: routes || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json({ error: 'Failed to fetch routes' }, { status: 500 });
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
    const { origin_city, origin_province, destination_city, destination_province, base_price_usd, distance_km, estimated_duration_hours } = body;

    if (!origin_city || !destination_city || !base_price_usd) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const insertData = {
      origin_city: origin_city,
      origin_province: origin_province || null,
      destination_city: destination_city,
      destination_province: destination_province || null,
      base_price_usd: parseFloat(base_price_usd),
      company_id: companyId,
      is_active: true
    };

    if (distance_km !== undefined) insertData.distance_km = parseFloat(distance_km);
    if (estimated_duration_hours !== undefined) insertData.estimated_duration_hours = parseFloat(estimated_duration_hours);

    const { data: route, error: routeError } = await supabase
      .from('routes')
      .insert(insertData)
      .select()
      .single();

    if (routeError) throw routeError;

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    console.error('Error creating route:', error);
    return NextResponse.json({ error: 'Failed to create route' }, { status: 500 });
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
    const { id, origin, destination, distance_km, estimated_duration_minutes, price_base, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Route ID is required' }, { status: 400 });
    }

    // Check ownership
    const { data: existingRoute, error: checkError } = await supabase
      .from('routes')
      .select('id')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (checkError || !existingRoute) {
      return NextResponse.json({ error: 'Route not found or access denied' }, { status: 404 });
    }

    const updateData = {};
    if (origin !== undefined) {
      const [originCity, originProvince] = origin.split(',').map(s => s.trim());
      updateData.origin_city = originCity;
      updateData.origin_province = originProvince || null;
    }
    if (destination !== undefined) {
      const [destinationCity, destinationProvince] = destination.split(',').map(s => s.trim());
      updateData.destination_city = destinationCity;
      updateData.destination_province = destinationProvince || null;
    }
    if (distance_km !== undefined) updateData.distance_km = parseFloat(distance_km);
    if (estimated_duration_minutes !== undefined) updateData.estimated_duration_hours = parseInt(estimated_duration_minutes) / 60.0;
    if (price_base !== undefined) updateData.base_price_usd = parseFloat(price_base);
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: route, error: routeError } = await supabase
      .from('routes')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (routeError) throw routeError;

    return NextResponse.json(route);
  } catch (error) {
    console.error('Error updating route:', error);
    return NextResponse.json({ error: 'Failed to update route' }, { status: 500 });
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
      return NextResponse.json({ error: 'Route ID is required' }, { status: 400 });
    }

    // Check ownership and delete
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (routeError) {
      if (routeError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Route not found or access denied' }, { status: 404 });
      }
      throw routeError;
    }

    return NextResponse.json({ message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Error deleting route:', error);
    return NextResponse.json({ error: 'Failed to delete route' }, { status: 500 });
  }
}
