// apps/api/src/modules/chat/chat.controller.ts
// REST endpoints para listar salas e criar sala com paciente
import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ChatService }   from './chat.service';
import { JwtAuthGuard }  from '../../common/guards/jwt-auth.guard';
import { RolesGuard }    from '../../common/guards/roles.guard';
import { Roles }         from '../../common/decorators/roles.decorator';
import { CurrentUser }   from '../../common/decorators/current-user.decorator';

@Controller('doutor/chat')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('doctor')
export class ChatController {
  constructor(private readonly svc: ChatService) {}

  // Lista todas as salas do médico (com última mensagem)
  @Get('rooms')
  listRooms(@CurrentUser() u: any) {
    return this.svc.listRooms(u.id);
  }

  // Cria ou retorna sala com um paciente (pelo userId do paciente)
  @Post('rooms')
  getOrCreate(@CurrentUser() u: any, @Body() body: { patientId: string }) {
    return this.svc.getOrCreateRoom(u.id, body.patientId);
  }

  // Histórico de mensagens de uma sala
  @Get('rooms/:roomId/messages')
  getMessages(
    @CurrentUser() u: any,
    @Param('roomId') roomId: string,
    @Query('before')  before:  string,
  ) {
    return this.svc.getMessages(roomId, before);
  }
}
