import { reserveNextInvoiceNumber } from './numbering.js';
import { getExchangeRate } from './exchange.js';
import { toAOA, splitNetAndIva, round2 } from './amounts.js';
import { signInvoiceHash } from './hash.js';
import { DEFAULT_INVOICE_TYPE, DEFAULT_IVA_CODE, DEFAULT_IVA_RATE, SOURCE_CURRENCY } from './config.js';

// Given a ticket row (after being marked paid), fills in all SAF-T-AO fiscal
// fields: invoice number, AOA amounts, exchange rate, hash chain, etc.
// Idempotent — if `invoice_no` is already set, returns the existing row unchanged.
export async function generateInvoiceForTicket(supabase, ticketId) {
  const { data: ticket, error: ticketErr } = await supabase
    .from('tickets')
    .select(`
      id, ticket_number, price_paid_usd, payment_status, created_at, booking_time,
      invoice_no, invoice_type, invoice_date, system_entry_date,
      amount_aoa, net_aoa, iva_aoa, exchange_rate_usd_aoa,
      iva_code, iva_rate, hash, previous_hash, invoice_status,
      passenger_id, trip_id,
      trip:trips(id, bus:buses(company_id))
    `)
    .eq('id', ticketId)
    .single();

  if (ticketErr) throw new Error(`Ticket not found: ${ticketErr.message}`);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found`);
  if (ticket.invoice_no) return ticket;
  if (ticket.payment_status !== 'paid') {
    throw new Error(`Ticket ${ticketId} is not paid (status=${ticket.payment_status})`);
  }

  const companyId = ticket.trip?.bus?.company_id;
  if (!companyId) {
    throw new Error(`Cannot determine company for ticket ${ticketId}`);
  }

  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('id, iva_rate, iva_code, currency_code')
    .eq('id', companyId)
    .single();
  if (companyErr) throw new Error(`Company not found: ${companyErr.message}`);

  const ivaRate = Number(company.iva_rate ?? DEFAULT_IVA_RATE);
  const ivaCode = company.iva_code || DEFAULT_IVA_CODE;

  const invoiceDateRaw = ticket.booking_time || ticket.created_at || new Date().toISOString();
  const invoiceDate = new Date(invoiceDateRaw);
  const invoiceDateStr = invoiceDate.toISOString().slice(0, 10);
  const systemEntryDateStr = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z').slice(0, 19);

  const rate = await getExchangeRate(supabase, {
    fromCurrency: SOURCE_CURRENCY,
    toCurrency: 'AOA',
    onDate: invoiceDate,
  });

  const usd = Number(ticket.price_paid_usd) || 0;
  const grossAoa = toAOA(usd, rate);
  const { net, iva } = splitNetAndIva(grossAoa, ivaRate);

  const seriesCode = String(invoiceDate.getFullYear());
  const { invoiceNo } = await reserveNextInvoiceNumber(supabase, {
    companyId,
    invoiceType: DEFAULT_INVOICE_TYPE,
    seriesCode,
  });

  const { data: previousInvoice } = await supabase
    .from('tickets')
    .select('hash')
    .eq('invoice_company_id', companyId)
    .not('hash', 'is', null)
    .neq('id', ticketId)
    .order('system_entry_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousHash = previousInvoice?.hash || '';

  const hash = signInvoiceHash({
    invoiceDate: invoiceDateStr,
    systemEntryDate: systemEntryDateStr,
    grossTotal: grossAoa,
    invoiceNo,
    previousHash,
  });

  const update = {
    invoice_no: invoiceNo,
    invoice_type: DEFAULT_INVOICE_TYPE,
    invoice_date: invoiceDateStr,
    system_entry_date: systemEntryDateStr,
    amount_aoa: round2(grossAoa),
    net_aoa: net,
    iva_aoa: iva,
    exchange_rate_usd_aoa: rate,
    iva_code: ivaCode,
    iva_rate: ivaRate,
    hash,
    hash_control: '0',
    previous_hash: previousHash,
    invoice_status: 'N',
    source_billing: 'P',
    invoice_company_id: companyId,
  };

  const { data: updated, error: updateErr } = await supabase
    .from('tickets')
    .update(update)
    .eq('id', ticketId)
    .is('invoice_no', null)
    .select()
    .maybeSingle();

  if (updateErr) {
    throw new Error(`Failed to persist invoice fields: ${updateErr.message}`);
  }

  // Race lost — another worker already generated; return current state.
  if (!updated) {
    const { data: reloaded } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();
    return reloaded;
  }

  return updated;
}

// Backfill unsigned paid tickets for a company + period. Processes chronologically
// so the hash chain remains consistent. Returns the count of newly generated invoices.
export async function backfillPeriod(supabase, { companyId, startDate, endDate }) {
  const { data: unsigned, error } = await supabase
    .from('tickets')
    .select('id, trip:trips(id, bus:buses(company_id))')
    .eq('payment_status', 'paid')
    .is('invoice_no', null)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Backfill query failed: ${error.message}`);

  let generated = 0;
  for (const row of unsigned || []) {
    if (row.trip?.bus?.company_id !== companyId) continue;
    await generateInvoiceForTicket(supabase, row.id);
    generated++;
  }
  return generated;
}
