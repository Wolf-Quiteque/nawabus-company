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
      .from('buses')
      .select(`
        id,
        license_plate,
        make,
        model,
        year,
        capacity,
        amenities,
        is_active,
        created_at,
        trips(count)
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (search) {
      query = query.or(`license_plate.ilike.%${search}%,make.ilike.%${search}%,model.ilike.%${search}%`);
    }

    if (isActive !== null && isActive !== '') {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: buses, error: busesError } = await query;

    if (busesError) throw busesError;

    // Get total count for pagination
    let countQuery = supabase
      .from('buses')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId);

    if (search) {
      countQuery = countQuery.or(`license_plate.ilike.%${search}%,make.ilike.%${search}%,model.ilike.%${search}%`);
    }

    if (isActive !== null && isActive !== '') {
      countQuery = countQuery.eq('is_active', isActive === 'true');
    }

    const { count, error: countError } = await countQuery;

    if (countError) throw countError;

    return NextResponse.json({
      buses: buses || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching buses:', error);
    return NextResponse.json({ error: 'Failed to fetch buses' }, { status: 500 });
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
    const { license_plate, make, model, year, capacity, amenities } = body;

    if (!license_plate || !make || !model || !year || !capacity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: bus, error: busError } = await supabase
      .from('buses')
      .insert({
        license_plate,
        make,
        model,
        year: parseInt(year),
        capacity: parseInt(capacity),
        amenities: amenities || [],
        company_id: companyId,
        is_active: true
      })
      .select()
      .single();

    if (busError) throw busError;

    return NextResponse.json(bus, { status: 201 });
  } catch (error) {
    console.error('Error creating bus:', error);
    return NextResponse.json({ error: 'Failed to create bus' }, { status: 500 });
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
    const { id, license_plate, make, model, year, capacity, amenities, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Bus ID is required' }, { status: 400 });
    }

    // Check ownership
    const { data: existingBus, error: checkError } = await supabase
      .from('buses')
      .select('id')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (checkError || !existingBus) {
      return NextResponse.json({ error: 'Bus not found or access denied' }, { status: 404 });
    }

    const updateData = {};
    if (license_plate !== undefined) updateData.license_plate = license_plate;
    if (make !== undefined) updateData.make = make;
    if (model !== undefined) updateData.model = model;
    if (year !== undefined) updateData.year = parseInt(year);
    if (capacity !== undefined) updateData.capacity = parseInt(capacity);
    if (amenities !== undefined) updateData.amenities = amenities;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: bus, error: busError } = await supabase
      .from('buses')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (busError) throw busError;

    return NextResponse.json(bus);
  } catch (error) {
    console.error('Error updating bus:', error);
    return NextResponse.json({ error: 'Failed to update bus' }, { status: 500 });
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
      return NextResponse.json({ error: 'Bus ID is required' }, { status: 400 });
    }

    // Check ownership and delete
    const { data: bus, error: busError } = await supabase
      .from('buses')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId)
      .select()
      .single();

    if (busError) {
      if (busError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Bus not found or access denied' }, { status: 404 });
      }
      throw busError;
    }

    return NextResponse.json({ message: 'Bus deleted successfully' });
  } catch (error) {
    console.error('Error deleting bus:', error);
    return NextResponse.json({ error: 'Failed to delete bus' }, { status: 500 });
  }
}
