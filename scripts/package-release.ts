import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release-commercial');
const zipOutPath = path.join(rootDir, 'figma-spec-pro-v1.1.0.zip');

async function main() {
  console.log('[1/2] Building hardened commercial binaries...');
  const buildScript = path.join(__dirname, 'build-commercial.ts');
  const buildRes = spawnSync(process.execPath, ['--import', 'tsx', buildScript], {
    cwd: rootDir,
    stdio: 'inherit'
  });

  if (buildRes.status !== 0) {
    console.error('Build step failed.');
    process.exit(1);
  }

  console.log('[2/2] Creating digital fulfillment ZIP package (for Creem upload)...');
  // Use Python's standard zipfile for zero-dependency universal ZIP packaging
  const pyCode = `
import zipfile, os
rel_dir = r"${releaseDir}"
out_zip = r"${zipOutPath}"
if os.path.exists(out_zip):
    os.remove(out_zip)
with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(rel_dir):
        for file in files:
            full_p = os.path.join(root, file)
            arc_p = os.path.relpath(full_p, rel_dir)
            z.write(full_p, arc_p)
print(f"Package created: {out_zip} ({os.path.getsize(out_zip)} bytes)")
`;

  const zipRes = spawnSync('python', ['-c', pyCode], { stdio: 'inherit' });
  if (zipRes.status !== 0) {
    console.error('Packaging failed.');
    process.exit(1);
  }

  console.log('\n[SUCCESS] Fulfillment package ready: figma-spec-pro-v1.1.0.zip');
  console.log('You can now upload this ZIP file directly to Gumroad as the digital download file.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
