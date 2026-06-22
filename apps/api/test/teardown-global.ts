// apps/api/test/teardown-global.ts
// Roda UMA VEZ depois de todos os testes E2E.

export default async function globalTeardown() {
  console.log('\n🧹 [E2E Teardown] Concluído.\n');
}
