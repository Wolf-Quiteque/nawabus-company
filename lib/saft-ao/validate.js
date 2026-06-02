import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Validates XML against the SAF-T-AO XSD if libxmljs2 is available.
// Falls back to a soft "unvalidated" result so the export still works even
// when the native addon can't be built on the host (common on Windows dev).
export async function validateSaftAoXml(xml) {
  let libxmljs;
  try {
    libxmljs = (await import('libxmljs2')).default || (await import('libxmljs2'));
  } catch (err) {
    return {
      valid: null,
      unavailable: true,
      message:
        'libxmljs2 not installed/loadable — XSD validation skipped. Run `npm i libxmljs2` to enable.',
      errors: [],
    };
  }

  const xsdPath = findXsdPath();
  if (!xsdPath) {
    return {
      valid: null,
      unavailable: true,
      message: 'SAFTAO1.01_01.xsd not found. Ensure the SAF-T-AO/ folder is present at the repo root.',
      errors: [],
    };
  }

  const xsdSource = readFileSync(xsdPath, 'utf8');
  const xsdDoc = libxmljs.parseXml(xsdSource);
  const xmlDoc = libxmljs.parseXml(xml);

  const ok = xmlDoc.validate(xsdDoc);
  return {
    valid: ok,
    unavailable: false,
    message: ok ? 'Valid against SAFTAO1.01_01.xsd' : 'XSD validation failed',
    errors: (xmlDoc.validationErrors || []).map((e) => ({
      line: e.line,
      column: e.column,
      message: e.message,
    })),
  };
}

function findXsdPath() {
  const candidates = [
    join(process.cwd(), '..', 'SAF-T-AO', 'XSD', 'SAFTAO1.01_01.xsd'),
    join(process.cwd(), 'SAF-T-AO', 'XSD', 'SAFTAO1.01_01.xsd'),
    join(process.cwd(), '..', '..', 'SAF-T-AO', 'XSD', 'SAFTAO1.01_01.xsd'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}
