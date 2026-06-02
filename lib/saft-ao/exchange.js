export async function getExchangeRate(supabase, {
  fromCurrency = 'USD',
  toCurrency = 'AOA',
  onDate,
}) {
  const dateStr = onDate instanceof Date ? onDate.toISOString().slice(0, 10) : onDate;

  const { data, error } = await supabase
    .from('exchange_rates')
    .select('rate, effective_date')
    .eq('from_currency', fromCurrency)
    .eq('to_currency', toCurrency)
    .lte('effective_date', dateStr)
    .order('effective_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load exchange rate: ${error.message}`);
  }
  if (!data) {
    throw new Error(
      `No ${fromCurrency}->${toCurrency} exchange rate defined on or before ${dateStr}. ` +
      `Add one at /exchange-rates.`
    );
  }
  return Number(data.rate);
}
