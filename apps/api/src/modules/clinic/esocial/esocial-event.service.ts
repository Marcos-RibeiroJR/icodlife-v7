// apps/api/src/modules/clinic/esocial/esocial-event.service.ts
// Monta os eventos S-2220 (Monitoramento da Saúde do Trabalhador) e S-2240
// (Condições Ambientais do Trabalho) a partir de um ASO já emitido.
//
// IMPORTANTE — escopo deliberado: este serviço gera o EVENTO ESTRUTURADO
// (JSON/XML) pronto para conferência e para ser entregue ao sistema de
// transmissão eSocial que a clínica já utiliza (ou ao contador/integrador
// responsável). Ele NÃO assina nem envia o evento ao webservice do governo —
// isso exige certificado digital e-CNPJ da empresa contratante, que não temos
// como manusear com segurança a partir daqui. Os códigos das Tabelas 24
// (riscos) e 27 (procedimentos) devem ser conferidos pela clínica na versão
// vigente do Manual de Orientação do eSocial; mantemos aqui só os códigos que
// confirmamos em fontes oficiais (ausência de risco e "outro procedimento"),
// para não gravar um código incorreto num evento com efeito legal/fiscal.
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TABELA24_SEM_RISCO } from './tabela24-riscos';

const TP_EXAME_OCUP: Record<string, string> = {
  admissional: '0',
  periodico: '1',
  retorno: '2',
  mudanca_funcao: '3',
  demissional: '9',
};

const RES_ASO: Record<string, string> = {
  apto: '1',
  apto_restricoes: '1',
  inapto: '2',
};

const PROC_OUTRO = '9999'; // Tabela 27 — "outro procedimento" (exige obsProc)

@Injectable()
export class EsocialEventService {
  constructor(private prisma: PrismaService) {}

  private async loadContext(asoId: string) {
    const aso = await this.prisma.aso.findUnique({
      where: { id: asoId },
      include: { doctor: { include: { user: true } }, company: true },
    });
    if (!aso) return null;
    return aso;
  }

  private assertRequired(checks: Array<[boolean, string]>) {
    const missing = checks.filter(([ok]) => !ok).map(([, label]) => label);
    if (missing.length) {
      throw new BadRequestException(
        `Não é possível gerar o evento eSocial — faltam dados obrigatórios: ${missing.join('; ')}.`,
      );
    }
  }

  async buildS2220(asoId: string) {
    const aso = await this.loadContext(asoId);
    if (!aso) throw new BadRequestException('ASO não encontrado.');

    const tpExameOcup = TP_EXAME_OCUP[aso.examType];
    const resAso = RES_ASO[aso.result];
    const pcmso = (aso.company?.medicina as any)?.pcmsoResp ?? {};

    this.assertRequired([
      [!!aso.companyCnpj, 'CNPJ da empresa'],
      [!!aso.workerCpf, 'CPF do trabalhador'],
      [!!tpExameOcup, 'tipo de exame não mapeado para o eSocial'],
      [!!resAso, 'resultado do ASO não mapeado para o eSocial'],
      [!!aso.doctorCrm && !!aso.doctorUf, 'CRM/UF do médico examinador'],
      [!!pcmso.nome && !!pcmso.crm && !!pcmso.crmUf, 'médico responsável pelo PCMSO (cadastre em Empresas > Medicina Ocupacional)'],
    ]);

    const exames = ((aso.complementaryExams as any[]) ?? []).map((e) => ({
      dtExm: (e.date ?? aso.examDate).toString().slice(0, 10),
      procRealizado: e.procedureCode || PROC_OUTRO,
      obsProc: e.procedureCode && e.procedureCode !== PROC_OUTRO ? undefined : (e.obsProc || e.name),
      indResult: e.resultIndicator || undefined,
      nomeExame: e.name, // informativo, não faz parte do leiaute oficial
    }));

    return {
      evento: 'S-2220',
      descricao: 'Monitoramento da Saúde do Trabalhador',
      geradoEm: new Date().toISOString(),
      avisoLegal: 'Evento gerado localmente para conferência/transmissão pelo sistema eSocial da clínica — não enviado automaticamente ao governo.',
      ideEmpregador: { tpInsc: '1', nrInsc: aso.companyCnpj },
      ideVinculo: { cpfTrab: aso.workerCpf, matricula: aso.workerRegistration || undefined },
      exMedOcup: {
        tpExameOcup,
        aso: {
          dtAso: aso.examDate.toISOString().slice(0, 10),
          resAso,
          exame: exames.length ? exames : [{ dtExm: aso.examDate.toISOString().slice(0, 10), procRealizado: PROC_OUTRO, obsProc: 'Avaliação clínica ocupacional' }],
          medico: { nmMed: aso.doctorName, nrCRM: aso.doctorCrm, ufCRM: aso.doctorUf },
          respMonit: { cpfResp: pcmso.cpf || undefined, nmResp: pcmso.nome, nrCRM: pcmso.crm, ufCRM: pcmso.crmUf },
        },
      },
    };
  }

  async buildS2240(asoId: string) {
    const aso = await this.loadContext(asoId);
    if (!aso) throw new BadRequestException('ASO não encontrado.');

    this.assertRequired([
      [!!aso.companyCnpj, 'CNPJ da empresa'],
      [!!aso.workerCpf, 'CPF do trabalhador'],
    ]);

    const riscos = ((aso.riskFactorsEsocial as any[]) ?? []);
    const agNoc = riscos.length
      ? riscos.map((r) => ({
          codAgNoc: r.code,
          descricao: r.description,
          epiEficaz: r.epiEffective ? 'S' : 'N',
          epiCA: r.epiCA || undefined,
        }))
      : [{ codAgNoc: TABELA24_SEM_RISCO.code, descricao: TABELA24_SEM_RISCO.description, epiEficaz: 'N' }];

    return {
      evento: 'S-2240',
      descricao: 'Condições Ambientais do Trabalho — Agentes Nocivos',
      geradoEm: new Date().toISOString(),
      avisoLegal: 'Evento gerado localmente para conferência/transmissão pelo sistema eSocial da clínica — não enviado automaticamente ao governo. Códigos da Tabela 24 devem ser conferidos pela clínica na versão vigente do MoS.',
      ideEmpregador: { tpInsc: '1', nrInsc: aso.companyCnpj },
      ideVinculo: { cpfTrab: aso.workerCpf, matricula: aso.workerRegistration || undefined },
      infoAmb: {
        dtIniCondicao: (aso.admissionDate ?? aso.examDate).toISOString().slice(0, 10),
        localAmb: { dscSetor: aso.workerSector || undefined },
        condicaoAmb: { agNoc },
      },
    };
  }

  /** Serialização XML simples (sem libs externas) — indentação 2 espaços, escapando entidades. */
  toXml(rootTag: string, obj: any): string {
    const esc = (v: any) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const render = (node: any, tag: string, depth: number): string => {
      const pad = '  '.repeat(depth);
      if (node === undefined || node === null) return '';
      if (Array.isArray(node)) {
        return node.map((item) => render(item, tag, depth)).join('');
      }
      if (typeof node === 'object') {
        const inner = Object.entries(node)
          .map(([k, v]) => render(v, k, depth + 1))
          .join('');
        return `${pad}<${tag}>\n${inner}${pad}</${tag}>\n`;
      }
      return `${pad}<${tag}>${esc(node)}</${tag}>\n`;
    };
    return `<?xml version="1.0" encoding="UTF-8"?>\n` + render(obj, rootTag, 0);
  }
}
