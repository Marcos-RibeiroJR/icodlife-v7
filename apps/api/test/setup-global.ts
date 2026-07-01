// apps/api/test/setup-global.ts
// Roda UMA VEZ antes de todos os testes E2E.
// Aplica migrations no banco de teste (DATABASE_URL deve apontar para DB de teste).

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export default async function globalSetup() {
  const rootDir = path.join(__dirname, '..');

  // Carrega .env manualmente (apps/api/.env)
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/, '');
        process.env[key] = val;
      }
    }
  }

  console.log('Running prisma db push for test database...');
  execSync('npx prisma db push --force-reset', { cwd: rootDir, stdio: 'inherit' });
}
