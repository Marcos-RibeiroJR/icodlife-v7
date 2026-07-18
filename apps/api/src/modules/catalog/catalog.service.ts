// apps/api/src/modules/catalog/catalog.service.ts
// Busca de exames (TUSS embutida) e medicamentos (ANVISA ao vivo + fallback embutido).
import { Injectable, Logger } from '@nestjs/common';
import { TUSS_EXAMES, CatalogExam } from './data/tuss-exames';
import { MEDICAMENTOS_COMUNS } from './data/medicamentos';

const norm = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  /** Busca de exames no catálogo embutido (base TUSS). */
  searchExams(q: string, limit = 20): { source: string; items: CatalogExam[] } {
    const nq = norm(q);
    const items = !nq
      ? TUSS_EXAMES.slice(0, limit)
      : TUSS_EXAMES.filter((e) => norm(e.name).includes(nq)).slice(0, limit);
    return { source: 'tuss-local', items };
  }

  /** Busca de medicamentos: ANVISA ao vivo + fallback na lista embutida. */
  async searchMedications(q: string, limit = 20): Promise<{ source: string; items: string[] }> {
    const nq = norm(q);

    // 1) matches locais (rápido, sempre disponível)
    const local = (!nq
      ? MEDICAMENTOS_COMUNS
      : MEDICAMENTOS_COMUNS.filter((m) => norm(m).includes(nq))
    ).slice(0, limit);

    // 2) enriquecimento ANVISA (best-effort, com timeout curto)
    let anvisa: string[] = [];
    if (nq && nq.length >= 3) {
      try {
        const url = `https://consultas.anvisa.gov.br/api/consulta/medicamentos?count=15&page=1&filter[nomeProduto]=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          headers: { Authorization: 'Guest', Accept: 'application/json' },
          signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(3000) : undefined,
        });
        if (res.ok) {
          const j: any = await res.json();
          anvisa = (Array.isArray(j?.content) ? j.content : [])
            .map((x: any) => x?.nomeProduto || x?.nome || '')
            .filter(Boolean);
        }
      } catch (e: any) {
        this.logger.warn(`ANVISA indisponível, usando fallback local: ${e?.message ?? e}`);
      }
    }

    // 3) merge sem duplicatas (case/acento-insensitive), locais primeiro
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const name of [...local, ...anvisa]) {
      const key = norm(name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(name);
      if (merged.length >= limit) break;
    }

    return { source: anvisa.length ? 'anvisa+local' : 'local', items: merged };
  }
}
