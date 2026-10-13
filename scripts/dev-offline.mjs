import { spawn } from 'node:child_process';
const base = 'http://127.0.0.1:8093/v1/projects/demo-startupup-website/databases/(default)/documents/artifacts/startup-up-realestate/public/data';
const fields = data => Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
  typeof value === 'number' ? { integerValue: String(value) } : { stringValue: value }]));
try {
  // Only loopback + a demo project can be seeded. There is no production fallback.
  const documents = {
    'properties/demo-house': { custom_id: 'demo-1', project_name: 'บ้านตัวอย่างสำหรับทดสอบ', house_number: '1/1', price: 2000000, category: 'บ้านเดี่ยว', property_owner: 'Startup Up' },
    'site_settings/public_version': { version: 'local-demo' },
    'company_info/main': { companyName: 'Startup Up — Local test' },
    'site_settings/visual': {}, 'site_settings/popup': {}, 'site_settings/sale_promotion': {},
  };
  for (const [path, data] of Object.entries(documents)) {
    const response = await fetch(`${base}/${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: fields(data) }), signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error(`Emulator seed failed: ${response.status}`);
  }
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', ...process.argv.slice(2)], {
    stdio: 'inherit', env: { ...process.env, NEXT_PUBLIC_FIREBASE_EMULATOR: '1',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8093', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9097' },
  });
  child.on('exit', code => { process.exitCode = code || 0; });
} catch (error) {
  console.error('Start npm run emulators first (requires Java 21+). Offline mode has stopped; no production database was contacted.');
  console.error(error.message); process.exitCode = 1;
}
