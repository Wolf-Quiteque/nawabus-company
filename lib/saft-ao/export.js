import { buildSaftAoXml } from './xml-builder.js';
import { backfillPeriod } from './generate-invoice.js';
import { round2 } from './amounts.js';

function monthRange(year, month) {
  const pad = (n) => String(n).padStart(2, '0');
  const startDate = `${year}-${pad(month)}-01`;
  const last = new Date(year, month, 0).getDate();
  const endDate = `${year}-${pad(month)}-${pad(last)}`;
  return { startDate, endDate };
}

export async function loadExportData(supabase, { companyId, year, month }) {
  const { startDate, endDate } = monthRange(year, month);

  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();
  if (companyErr) throw new Error(`Company load failed: ${companyErr.message}`);

  await backfillPeriod(supabase, {
    companyId,
    startDate: `${startDate}T00:00:00Z`,
    endDate: `${endDate}T23:59:59Z`,
  });

  const { data: tickets, error: ticketsErr } = await supabase
    .from('tickets')
    .select(`
      id, ticket_number, invoice_no, invoice_type, invoice_date, system_entry_date,
      amount_aoa, net_aoa, iva_aoa, exchange_rate_usd_aoa, iva_code, iva_rate,
      hash, hash_control, previous_hash, invoice_status, invoice_status_reason,
      source_billing, payment_method, price_paid_usd,
      passenger_id, booked_by, trip_id,
      trip:trips(
        id,
        route:routes(id, origin_city, destination_city),
        bus:buses(company_id)
      )
    `)
    .eq('invoice_company_id', companyId)
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)
    .not('invoice_no', 'is', null)
    .order('system_entry_date', { ascending: true });

  if (ticketsErr) throw new Error(`Invoice load failed: ${ticketsErr.message}`);

  const passengerIds = [...new Set((tickets || []).map((t) => t.passenger_id).filter(Boolean))];
  let profiles = [];
  if (passengerIds.length) {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, tax_id, billing_address, billing_city, billing_country')
      .in('id', passengerIds);
    profiles = data || [];
  }
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  const customersMap = new Map();
  const productsMap = new Map();
  const invoices = [];
  let totalCredit = 0;

  for (const t of tickets || []) {
    const profile = profileMap[t.passenger_id] || null;
    const customerId = t.passenger_id || 'CF';
    if (!customersMap.has(customerId)) {
      customersMap.set(customerId, {
        id: customerId,
        display_name: profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Consumidor Final'
          : 'Consumidor Final',
        tax_id: profile?.tax_id || '999999999',
        billing_address: profile?.billing_address,
        billing_city: profile?.billing_city,
        billing_country: profile?.billing_country || 'AO',
      });
    }

    const route = t.trip?.route;
    const productCode = route ? `ROUTE-${route.id.slice(0, 8)}` : `ROUTE-UNKNOWN`;
    const productDesc = route
      ? `${route.origin_city} → ${route.destination_city}`
      : 'Bilhete de transporte';
    if (!productsMap.has(productCode)) {
      productsMap.set(productCode, {
        code: productCode,
        description: productDesc,
      });
    }

    totalCredit = round2(totalCredit + Number(t.net_aoa || 0));

    invoices.push({
      invoice_no: t.invoice_no,
      invoice_type: t.invoice_type,
      invoice_date: t.invoice_date,
      system_entry_date: t.system_entry_date,
      amount_aoa: t.amount_aoa,
      net_aoa: t.net_aoa,
      iva_aoa: t.iva_aoa,
      iva_code: t.iva_code,
      iva_rate: t.iva_rate,
      hash: t.hash,
      hash_control: t.hash_control,
      invoice_status: t.invoice_status,
      invoice_status_reason: t.invoice_status_reason,
      source_billing: t.source_billing,
      source_id: t.booked_by || 'system',
      customer_id: customerId,
      product_code: productCode,
      product_description: productDesc,
      payment_method: t.payment_method,
      price_paid_usd: t.price_paid_usd,
      exchange_rate_usd_aoa: t.exchange_rate_usd_aoa,
    });
  }

  return {
    company,
    period: { year, month, startDate, endDate },
    customers: [...customersMap.values()],
    products: [...productsMap.values()],
    invoices,
    totals: { totalDebit: 0, totalCredit },
  };
}

export async function exportSaftAo(supabase, { companyId, year, month }) {
  const data = await loadExportData(supabase, { companyId, year, month });
  const xml = buildSaftAoXml(data);
  const nif = data.company.tax_id || data.company.license_number || '0';
  const pad = (n) => String(n).padStart(2, '0');
  const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '');
  const filename = `SAFTAO_${nif}_${year}${pad(month)}_${ts}.xml`;
  return { xml, filename, summary: {
    invoiceCount: data.invoices.length,
    netTotal: data.totals.totalCredit,
    ivaTotal: data.invoices.reduce((s, i) => s + Number(i.iva_aoa || 0), 0),
    grossTotal: data.invoices.reduce((s, i) => s + Number(i.amount_aoa || 0), 0),
  } };
}
