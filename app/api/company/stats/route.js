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

export async function GET() {
  try {
    const authResult = await getSupabaseAndCompanyId();
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { supabase, companyId } = authResult;

    // Get trip ids for this company first
    const { data: companyTrips, error: tripsQueryError } = await supabase
      .from('trips')
      .select('id')
      .eq('company_id', companyId);

    if (tripsQueryError) throw tripsQueryError;

    const tripIds = companyTrips.map(trip => trip.id);

    // Get total tickets sold (paid tickets) for this company
    const { data: ticketsData, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, passenger_id, price_paid_usd, status, created_at')
      .eq('payment_status', 'paid')
      .in('trip_id', tripIds);

    if (ticketsError) throw ticketsError;

    // Get total trips for this company
    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select('id, status, created_at')
      .eq('company_id', companyId);

    if (tripsError) throw tripsError;

    // Unique passengers who bought a paid ticket on one of this company's trips.
    // (profiles isn't company-scoped, so counting all passenger accounts would
    // leak the platform-wide user count to every company.)
    const totalPassengers = new Set(ticketsData.map(ticket => ticket.passenger_id).filter(Boolean)).size;

    // Get total revenue
    const totalRevenue = ticketsData.reduce((sum, ticket) => sum + (ticket.price_paid_usd || 0), 0);

    // Get monthly ticket sales for the last 12 months
    const monthlyTickets = {};
    const currentDate = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM format
      monthlyTickets[monthKey] = 0;
    }

    ticketsData.forEach(ticket => {
      const ticketDate = new Date(ticket.created_at);
      const monthKey = ticketDate.toISOString().slice(0, 7);
      if (monthlyTickets.hasOwnProperty(monthKey)) {
        monthlyTickets[monthKey]++;
      }
    });

    // Get ticket status distribution
    const statusCounts = {};
    ticketsData.forEach(ticket => {
      statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
    });

    // Get trip status distribution
    const tripStatusCounts = {};
    tripsData.forEach(trip => {
      tripStatusCounts[trip.status] = (tripStatusCounts[trip.status] || 0) + 1;
    });

    const stats = {
      totalTickets: ticketsData.length,
      totalTrips: tripsData.length,
      totalPassengers,
      totalRevenue: totalRevenue,
      monthlyTickets: Object.entries(monthlyTickets).map(([month, count]) => ({
        month,
        count
      })),
      ticketStatusDistribution: Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      })),
      tripStatusDistribution: Object.entries(tripStatusCounts).map(([status, count]) => ({
        status,
        count
      }))
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
