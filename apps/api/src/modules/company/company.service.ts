// apps/api/src/modules/company/company.service.ts
// Cadastro de empresas (Medicina do Trabalho). CRUD + enriquecimento por CNPJ (BrasilAPI).
import {
  Injectable, NotFoundException, BadRequestException, ConflictException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const onlyDigits = (s?: string) => (s ?? '').replace(/\D/g, '');

@Injectable()
export class CompanyService {
  private readonly logger = new Logger('CompanyService');

  constructor(private prisma: PrismaService) {}

  private async getDoctor(userId: string) {
    const doc = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doc) throw new NotFoundException('Perfil de doutor não encontrado');
    return doc;
  }

  async list(userId: string, page = 1, limit = 20, search?: string) {
    const doc = await this.getDoctor(userId);
    const skip = (page - 1) * limit;
    const where: any = { doctorId: doc.id };
    if (search) {
      const digits = onlyDigits(search);
      where.OR = [
        { razaoSocial: { contains: search, mode: 'insensitive' } },
        { nomeFantasia: { contains: search, mode: 'insensitive' } },
        ...(digits ? [{ cnpj: { contains: digits } }] : []),
      ];
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({ where, skip, take: limit, orderBy: { razaoSocial: 'asc' } }),
      this.prisma.company.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async get(userId: string, id: string) {
    const doc = await this.getDoctor(userId);
    const company = await this.prisma.company.findFirst({ where: { id, doctorId: doc.id } });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    return company;
  }

  async create(userId: string, dto: any) {
    const doc = await this.getDoctor(userId);
    if (!dto.razaoSocial) throw new BadRequestException('Razão social é obrigatória.');
    const cnpj = onlyDigits(dto.cnpj);
    if (!cnpj || cnpj.length !== 14) throw new BadRequestException('CNPJ inválido (14 dígitos).');

    const dup = await this.prisma.company.findFirst({ where: { doctorId: doc.id, cnpj } });
    if (dup) throw new ConflictException('Já existe uma empresa cadastrada com este CNPJ.');

    return this.prisma.company.create({
      data: { ...this.mapWritable(dto), cnpj, doctorId: doc.id, createdBy: userId },
    });
  }

  async update(userId: string, id: string, dto: any) {
    const doc = await this.getDoctor(userId);
    const existing = await this.prisma.company.findFirst({ where: { id, doctorId: doc.id } });
    if (!existing) throw new NotFoundException('Empresa não encontrada');
    const data: any = { ...this.mapWritable(dto), updatedBy: userId, version: { increment: 1 } };
    if (dto.cnpj !== undefined) {
      const cnpj = onlyDigits(dto.cnpj);
      if (cnpj.length !== 14) throw new BadRequestException('CNPJ inválido (14 dígitos).');
      data.cnpj = cnpj;
    }
    return this.prisma.company.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    const doc = await this.getDoctor(userId);
    const existing = await this.prisma.company.findFirst({ where: { id, doctorId: doc.id } });
    if (!existing) throw new NotFoundException('Empresa não encontrada');
    await this.prisma.company.delete({ where: { id } });
    return { deleted: true };
  }

  /** Enriquecimento por CNPJ. Tenta BrasilAPI e cai para ReceitaWS. Nao persiste — so retorna. */
  async lookupCnpj(cnpj: string) {
    const digits = onlyDigits(cnpj);
    if (digits.length !== 14) throw new BadRequestException('CNPJ invalido (14 digitos).');

    const errors: string[] = [];

    // 1) BrasilAPI
    try {
      const d = await this.getJson(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (d) return this.mapBrasilApi(digits, d);
    } catch (e: any) {
      errors.push(`BrasilAPI: ${e?.message ?? e}`);
    }

    // 2) ReceitaWS (fallback)
    try {
      const d = await this.getJson(`https://receitaws.com.br/v1/cnpj/${digits}`);
      if (d && d.status !== 'ERROR') return this.mapReceitaWs(digits, d);
      if (d?.status === 'ERROR') errors.push(`ReceitaWS: ${d.message ?? 'nao encontrado'}`);
    } catch (e: any) {
      errors.push(`ReceitaWS: ${e?.message ?? e}`);
    }

    this.logger.error(`Falha ao consultar CNPJ ${digits}: ${errors.join(' | ') || 'sem resposta'}`);
    throw new BadRequestException(
      `Nao foi possivel consultar o CNPJ nas bases publicas agora (${errors.join('; ') || 'sem resposta'}). Verifique a conexao do servidor ou preencha manualmente.`,
    );
  }

  private async getJson(url: string): Promise<any> {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; IcodLife/1.0; +https://icodlife.com)',
      },
      signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(8000) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  private mapBrasilApi(digits: string, d: any) {
    const cnaesSec: string = Array.isArray(d.cnaes_secundarios)
      ? d.cnaes_secundarios.map((c: any) => `${c.codigo} - ${c.descricao}`).join('; ')
      : '';
    return {
      source: 'brasilapi',
      cnpj: digits,
      razaoSocial:       d.razao_social ?? null,
      nomeFantasia:      d.nome_fantasia || null,
      cnaePrincipal:     d.cnae_fiscal ? `${d.cnae_fiscal} - ${d.cnae_fiscal_descricao ?? ''}`.trim() : null,
      cnaeSecundario:    cnaesSec || null,
      naturezaJuridica:  d.natureza_juridica ?? null,
      porte:             d.porte ?? d.descricao_porte ?? null,
      dataFundacao:      d.data_inicio_atividade ?? null,
      situacao:          (d.descricao_situacao_cadastral ?? '').toLowerCase().includes('ativa') ? 'ativa' : 'inativa',
      cep:               d.cep ? onlyDigits(String(d.cep)) : null,
      logradouro:        [d.descricao_tipo_de_logradouro, d.logradouro].filter(Boolean).join(' ') || null,
      numero:            d.numero ?? null,
      complemento:       d.complemento || null,
      bairro:            d.bairro ?? null,
      cidade:            d.municipio ?? null,
      estado:            d.uf ?? null,
      telefonePrincipal: d.ddd_telefone_1 ?? null,
      emailRh:           d.email ?? null,
      metadata: {
        capitalSocial: d.capital_social ?? null,
        qsa: d.qsa ?? null,
        situacaoCadastral: d.descricao_situacao_cadastral ?? null,
        consultaEm: new Date().toISOString(),
      },
    };
  }

  private mapReceitaWs(digits: string, d: any) {
    const cnaeSec = Array.isArray(d.atividades_secundarias)
      ? d.atividades_secundarias.map((c: any) => `${c.code} - ${c.text}`).join('; ')
      : '';
    const ap = Array.isArray(d.atividade_principal) ? d.atividade_principal[0] : null;
    return {
      source: 'receitaws',
      cnpj: digits,
      razaoSocial:       d.nome ?? null,
      nomeFantasia:      d.fantasia || null,
      cnaePrincipal:     ap ? `${ap.code} - ${ap.text}` : null,
      cnaeSecundario:    cnaeSec || null,
      naturezaJuridica:  d.natureza_juridica ?? null,
      porte:             d.porte ?? null,
      dataFundacao:      d.abertura ?? null,
      situacao:          (d.situacao ?? '').toLowerCase().includes('ativa') ? 'ativa' : 'inativa',
      cep:               d.cep ? onlyDigits(String(d.cep)) : null,
      logradouro:        d.logradouro ?? null,
      numero:            d.numero ?? null,
      complemento:       d.complemento || null,
      bairro:            d.bairro ?? null,
      cidade:            d.municipio ?? null,
      estado:            d.uf ?? null,
      telefonePrincipal: d.telefone ?? null,
      emailRh:           d.email ?? null,
      metadata: {
        capitalSocial: d.capital_social ?? null,
        qsa: d.qsa ?? null,
        situacaoCadastral: d.situacao ?? null,
        consultaEm: new Date().toISOString(),
      },
    };
  }

  /** Campos que o cliente pode gravar (evita sobrescrever id/doctorId/auditoria via body). */
  private mapWritable(dto: any) {
    const fields = [
      'razaoSocial', 'nomeFantasia', 'inscricaoEstadual', 'inscricaoMunicipal',
      'cnaePrincipal', 'cnaeSecundario', 'grauRisco', 'naturezaJuridica', 'codigoFpas',
      'codigoTerceiros', 'regimeTributario', 'porte', 'dataFundacao', 'situacao',
      'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado', 'pais',
      'latitude', 'longitude', 'telefonePrincipal', 'telefoneRh', 'whatsapp', 'emailRh',
      'emailSst', 'site', 'qtdFuncionarios', 'qtdTerceiros', 'qtdEstagiarios', 'qtdAprendizes',
      'turnos', 'funcionamento24h', 'sindicatoPatronal', 'sindicatoEmpregados', 'convencaoColetiva',
      'responsaveis', 'medicina', 'esocial', 'financeiro', 'config', 'metadata',
    ];
    const out: any = {};
    for (const f of fields) {
      if (dto[f] === undefined) continue;
      if (f === 'dataFundacao') { out[f] = dto[f] ? new Date(dto[f]) : null; continue; }
      out[f] = dto[f];
    }
    return out;
  }
}
