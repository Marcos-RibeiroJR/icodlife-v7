// apps/api/src/modules/export/export.controller.ts
import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ExportService } from './export.service';

@UseGuards(JwtAuthGuard)
@Controller('export')
export class ExportController {
  constructor(private svc: ExportService) {}

  /**
   * GET /export/pdf/me — prontuário do próprio usuário logado
   */
  @Get('pdf/me')
  async myPdf(@CurrentUser() u: any, @Res() res: any) {
    const buffer = await this.svc.generateProntuarioPdf(u.id, u.id);
    const filename = `prontuario-${u.id.slice(0, 8)}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  /**
   * GET /export/pdf/:userId — prontuário de paciente (para médico/admin)
   */
  @Get('pdf/:userId')
  async patientPdf(
    @Param('userId') userId: string,
    @CurrentUser() u: any,
    @Res() res: any,
  ) {
    const buffer = await this.svc.generateProntuarioPdf(userId, u.id);
    const filename = `prontuario-${userId.slice(0, 8)}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}
