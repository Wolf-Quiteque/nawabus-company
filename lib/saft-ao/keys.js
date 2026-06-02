import { generateKeyPairSync, createPrivateKey, createPublicKey } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DEV_KEY_PATH = join(process.cwd(), 'certificates', 'saftao_dev.pem');

let cachedPrivateKey = null;
let cachedPublicKey = null;

function loadFromEnv() {
  const pem = process.env.SAFTAO_PRIVATE_KEY;
  if (!pem) return null;
  return createPrivateKey({ key: pem.replace(/\\n/g, '\n'), format: 'pem' });
}

function loadFromFile() {
  if (!existsSync(DEV_KEY_PATH)) return null;
  const pem = readFileSync(DEV_KEY_PATH, 'utf8');
  return createPrivateKey({ key: pem, format: 'pem' });
}

function generateAndPersist() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  mkdirSync(dirname(DEV_KEY_PATH), { recursive: true });
  writeFileSync(DEV_KEY_PATH, privateKey, { mode: 0o600 });
  writeFileSync(DEV_KEY_PATH + '.pub', publicKey);

  return createPrivateKey({ key: privateKey, format: 'pem' });
}

export function getPrivateKey() {
  if (cachedPrivateKey) return cachedPrivateKey;

  cachedPrivateKey = loadFromEnv() || loadFromFile() || generateAndPersist();
  return cachedPrivateKey;
}

export function getPublicKey() {
  if (cachedPublicKey) return cachedPublicKey;
  cachedPublicKey = createPublicKey(getPrivateKey());
  return cachedPublicKey;
}
