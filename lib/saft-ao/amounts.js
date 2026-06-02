export function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

export function toAOA(usdAmount, rate) {
  if (!rate || rate <= 0) {
    throw new Error('Exchange rate must be positive');
  }
  return round2(Number(usdAmount) * Number(rate));
}

// Gross includes IVA (common for tickets). Returns net and IVA such that net + iva ≈ gross.
export function splitNetAndIva(gross, ivaRatePercent) {
  const grossN = Number(gross);
  const rate = Number(ivaRatePercent) / 100;
  const net = round2(grossN / (1 + rate));
  const iva = round2(grossN - net);
  return { net, iva };
}

export function formatDecimal(n, digits = 2) {
  return Number(n).toFixed(digits);
}
