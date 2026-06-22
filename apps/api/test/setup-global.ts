// apps/api/test/setup-global.ts
// Roda UMA VEZ antes de todos os testes E2E.
// Aplica migrations no banco de teste (DATABASE_URL deve apontar para DB de teste).

import { execSync } from 'child_process';
import * as path from 'path';

export default async function globalSetup() {
  const rootDir = path.join(__dirname, '..');
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
