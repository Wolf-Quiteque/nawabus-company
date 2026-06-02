import { DEFAULT_INVOICE_TYPE } from './config.js';

export async function reserveNextInvoiceNumber(supabase, {
  companyId,
  invoiceType = DEFAULT_INVOICE_TYPE,
  seriesCode,
}) {
  const { data, error } = await supabase.rpc('reserve_invoice_number', {
    p_company_id: companyId,
    p_invoice_type: invoiceType,
    p_series_code: seriesCode,
  });

  if (error) {
    throw new Error(`Failed to reserve invoice number: ${error.message}`);
  }

  const sequence = typeof data === 'number' ? data : Number(data);
  return {
    sequence,
    invoiceNo: `${invoiceType} ${seriesCode}/${sequence}`,
  };
}
