import { create } from 'xmlbuilder2';
import {
  SAFTAO_NAMESPACE,
  SAFTAO_VERSION,
  SAFTAO_XSI,
  TAX_ACCOUNTING_BASIS,
  TAX_ENTITY,
  PRODUCT_ID,
  PRODUCT_VERSION,
  VENDOR_TAX_ID,
} from './config.js';
import { formatDecimal } from './amounts.js';

const PAYMENT_MAP = {
  cash: 'NU',
  card: 'CC',
  bank_transfer: 'TB',
  mobile_money: 'MB',
  referencia: 'MB',
};

function paymentMechanism(method) {
  return PAYMENT_MAP[method] || 'OU';
}

function dateOnly(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

function isoDateTime(d) {
  if (!d) return '';
  return new Date(d).toISOString().replace(/\.\d{3}Z$/, 'Z').slice(0, 19);
}

function addCompanyAddress(parent, company) {
  const addr = parent.ele('CompanyAddress');
  addr.ele('AddressDetail').txt(company.fiscal_address || company.address || 'N/D');
  addr.ele('City').txt(company.fiscal_city || 'Luanda');
  addr.ele('PostalCode').txt(company.fiscal_postal_code || '0000');
  addr.ele('Country').txt(company.fiscal_country || 'AO');
}

function addBillingAddress(parent, profile) {
  const addr = parent.ele('BillingAddress');
  addr.ele('AddressDetail').txt(profile?.billing_address || 'N/D');
  addr.ele('City').txt(profile?.billing_city || 'Luanda');
  addr.ele('PostalCode').txt('0000');
  addr.ele('Country').txt(profile?.billing_country || 'AO');
}

export function buildSaftAoXml({ company, period, customers, products, invoices, totals }) {
  const doc = create({ version: '1.0', encoding: 'UTF-8', standalone: true });

  const root = doc
    .ele('AuditFile', {
      xmlns: SAFTAO_NAMESPACE,
      'xmlns:xsi': SAFTAO_XSI,
    });

  // ------------------- Header -------------------
  const header = root.ele('Header');
  header.ele('AuditFileVersion').txt(SAFTAO_VERSION);
  header.ele('CompanyID').txt(company.fiscal_name || company.name);
  header.ele('TaxRegistrationNumber').txt(company.tax_id || company.license_number || '0');
  header.ele('TaxAccountingBasis').txt(TAX_ACCOUNTING_BASIS);
  header.ele('CompanyName').txt(company.fiscal_name || company.name);
  if (company.name && company.name !== company.fiscal_name) {
    header.ele('BusinessName').txt(company.name);
  }
  addCompanyAddress(header, company);
  header.ele('FiscalYear').txt(String(period.year));
  header.ele('StartDate').txt(period.startDate);
  header.ele('EndDate').txt(period.endDate);
  header.ele('CurrencyCode').txt(company.currency_code || 'AOA');
  header.ele('DateCreated').txt(dateOnly(new Date()));
  header.ele('TaxEntity').txt(TAX_ENTITY);
  header.ele('ProductCompanyTaxID').txt(VENDOR_TAX_ID);
  header.ele('SoftwareValidationNumber').txt(company.software_validation_number || '0');
  header.ele('ProductID').txt(PRODUCT_ID);
  header.ele('ProductVersion').txt(PRODUCT_VERSION);
  if (company.contact_email) header.ele('Email').txt(company.contact_email);
  if (company.contact_phone) header.ele('Telephone').txt(company.contact_phone);

  // ------------------- MasterFiles -------------------
  const master = root.ele('MasterFiles');

  for (const customer of customers) {
    const c = master.ele('Customer');
    c.ele('CustomerID').txt(customer.id);
    c.ele('AccountID').txt('Desconhecido');
    c.ele('CustomerTaxID').txt(customer.tax_id || '999999999');
    c.ele('CompanyName').txt(customer.display_name || 'Consumidor Final');
    addBillingAddress(c, customer);
    c.ele('SelfBillingIndicator').txt('0');
  }

  for (const product of products) {
    const p = master.ele('Product');
    p.ele('ProductType').txt('S'); // service
    p.ele('ProductCode').txt(product.code);
    p.ele('ProductDescription').txt(product.description);
    p.ele('ProductNumberCode').txt(product.code);
  }

  const taxTable = master.ele('TaxTable');
  const taxEntry = taxTable.ele('TaxTableEntry');
  taxEntry.ele('TaxType').txt('IVA');
  taxEntry.ele('TaxCountryRegion').txt('AO');
  taxEntry.ele('TaxCode').txt(company.iva_code || 'NOR');
  taxEntry.ele('Description').txt(`IVA ${company.iva_code || 'NOR'} ${formatDecimal(company.iva_rate ?? 14)}%`);
  taxEntry.ele('TaxPercentage').txt(formatDecimal(company.iva_rate ?? 14));

  // ------------------- SourceDocuments / SalesInvoices -------------------
  const source = root.ele('SourceDocuments');
  const sales = source.ele('SalesInvoices');
  sales.ele('NumberOfEntries').txt(String(invoices.length));
  sales.ele('TotalDebit').txt(formatDecimal(totals.totalDebit));
  sales.ele('TotalCredit').txt(formatDecimal(totals.totalCredit));

  for (const inv of invoices) {
    const i = sales.ele('Invoice');
    i.ele('InvoiceNo').txt(inv.invoice_no);

    const status = i.ele('DocumentStatus');
    status.ele('InvoiceStatus').txt(inv.invoice_status || 'N');
    status.ele('InvoiceStatusDate').txt(isoDateTime(inv.system_entry_date));
    if (inv.invoice_status_reason) status.ele('Reason').txt(inv.invoice_status_reason);
    status.ele('SourceID').txt(inv.source_id || 'system');
    status.ele('SourceBilling').txt(inv.source_billing || 'P');

    i.ele('Hash').txt(inv.hash || '');
    i.ele('HashControl').txt(inv.hash_control || '0');
    i.ele('Period').txt(String(period.month));
    i.ele('InvoiceDate').txt(dateOnly(inv.invoice_date));
    i.ele('InvoiceType').txt(inv.invoice_type || 'FR');

    const specialRegimes = i.ele('SpecialRegimes');
    specialRegimes.ele('SelfBillingIndicator').txt('0');
    specialRegimes.ele('CashVATSchemeIndicator').txt('0');
    specialRegimes.ele('ThirdPartiesBillingIndicator').txt('0');

    i.ele('SourceID').txt(inv.source_id || 'system');
    i.ele('SystemEntryDate').txt(isoDateTime(inv.system_entry_date));
    i.ele('CustomerID').txt(inv.customer_id);

    const line = i.ele('Line');
    line.ele('LineNumber').txt('1');
    line.ele('ProductCode').txt(inv.product_code);
    line.ele('ProductDescription').txt(inv.product_description);
    line.ele('Quantity').txt('1');
    line.ele('UnitOfMeasure').txt('UN');
    line.ele('UnitPrice').txt(formatDecimal(inv.net_aoa));
    line.ele('TaxPointDate').txt(dateOnly(inv.invoice_date));
    line.ele('Description').txt(`Bilhete ${inv.invoice_no}`);
    line.ele('CreditAmount').txt(formatDecimal(inv.net_aoa));

    const tax = line.ele('Tax');
    tax.ele('TaxType').txt('IVA');
    tax.ele('TaxCountryRegion').txt('AO');
    tax.ele('TaxCode').txt(inv.iva_code || 'NOR');
    tax.ele('TaxPercentage').txt(formatDecimal(inv.iva_rate ?? 14));

    const doctotals = i.ele('DocumentTotals');
    doctotals.ele('TaxPayable').txt(formatDecimal(inv.iva_aoa));
    doctotals.ele('NetTotal').txt(formatDecimal(inv.net_aoa));
    doctotals.ele('GrossTotal').txt(formatDecimal(inv.amount_aoa));

    if (inv.price_paid_usd && inv.exchange_rate_usd_aoa) {
      const currency = doctotals.ele('Currency');
      currency.ele('CurrencyCode').txt('USD');
      currency.ele('CurrencyAmount').txt(formatDecimal(inv.price_paid_usd));
      currency.ele('ExchangeRate').txt(formatDecimal(inv.exchange_rate_usd_aoa, 6));
    }

    const payment = doctotals.ele('Payment');
    payment.ele('PaymentMechanism').txt(paymentMechanism(inv.payment_method));
    payment.ele('PaymentAmount').txt(formatDecimal(inv.amount_aoa));
    payment.ele('PaymentDate').txt(dateOnly(inv.invoice_date));
  }

  return doc.end({ prettyPrint: true });
}
