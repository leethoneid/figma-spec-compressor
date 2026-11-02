#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateOfflineLicenseToken, getCacheFilePath } from '../src/commercial/license.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function printUsage() {
  console.log(`
Usage:
  node --import tsx scripts/issue-license.ts --buyer <email> [--machine <fingerprint>] [--days <days>]

Options:
  --buyer <email>        Customer email address (required)
  --machine <hash>       Target machine hardware fingerprint (optional, locks to device)
  --days <number>        Validity period in days (defaults to 'never')
`);
}

function parseArgs(): { buyer?: string; machine?: string; days?: number } {
  const args = process.argv.slice(2);
  const result: any = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--buyer' && args[i + 1]) {
      result.buyer = args[++i];
    } else if (args[i] === '--machine' && args[i + 1]) {
      result.machine = args[++i];
    } else if (args[i] === '--days' && args[i + 1]) {
      result.days = parseInt(args[++i], 10);
    }
  }
  return result;
}

function main() {
  const { buyer, machine, days } = parseArgs();

  if (!buyer) {
    printUsage();
    process.exit(1);
  }

  const secretPath = path.join(rootDir, '.secrets', 'commercial-signer.private.pem');
  if (!fs.existsSync(secretPath) && !process.env.COMMERCIAL_SIGNER_PRIVATE_KEY) {
    console.error(`[ERROR] Private signing key not found at: ${secretPath}`);
    console.error('Please make sure .secrets/commercial-signer.private.pem exists.');
    process.exit(1);
  }

  const expiresAt = days ? new Date(Date.now() + days * 86400 * 1000).toISOString() : 'never';
  const licenseKey = `FSPLIC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const token = generateOfflineLicenseToken({
    licenseKey,
    buyerId: buyer,
    machineId: machine,
    expiresAt,
    issuedAt: new Date().toISOString()
  });

  console.log('====================================================');
  console.log('       OFFLINE COMMERCIAL LICENSE TOKEN ISSUED      ');
  console.log('====================================================');
  console.log(`Buyer:      ${buyer}`);
  console.log(`Machine:    ${machine || 'Unlocked (Any Device)'}`);
  console.log(`Expires:    ${expiresAt}`);
  console.log('----------------------------------------------------');
  console.log('Token (Deliver to Customer):');
  console.log(token);
  console.log('----------------------------------------------------');
  console.log('Customer activation command:');
  console.log(`figma-spec-pro activate ${token}\n`);
}

main();
