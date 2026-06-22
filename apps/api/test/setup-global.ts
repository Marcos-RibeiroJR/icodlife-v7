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
        const val = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }

  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error('DATABASE_URL não definida. Configure o banco de teste antes de rodar os E2E.');
  }

  console.log('\n🔧 [E2E Setup] Aplicando migrations no banco de teste...');
  execSync('npx prisma migrate deploy', {
    cwd: rootDir,
    env: { ...process.env },
    stdio: 'pipe',
  });
  console.log('✅ [E2E Setup] Migrations aplicadas\n');
}
