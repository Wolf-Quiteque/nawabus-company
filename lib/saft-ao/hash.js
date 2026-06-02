import { createSign, createVerify } from 'node:crypto';
import { getPrivateKey, getPublicKey } from './keys.js';

function canonicalPayload({ invoiceDate, systemEntryDate, grossTotal, invoiceNo, previousHash }) {
  const gross = Number(grossTotal).toFixed(2);
  return `${invoiceDate};${systemEntryDate};${gross};${invoiceNo};${previousHash || ''}`;
}

export function signInvoiceHash(params) {
  const payload = canonicalPayload(params);
  const signer = createSign('RSA-SHA256');
  signer.update(payload);
  signer.end();
  return signer.sign(getPrivateKey(), 'base64');
}

export function verifyInvoiceHash(params, hash) {
  const payload = canonicalPayload(params);
  const verifier = createVerify('RSA-SHA256');
  verifier.update(payload);
  verifier.end();
  return verifier.verify(getPublicKey(), hash, 'base64');
}
