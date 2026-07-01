// apps/api/src/modules/telemedicine/telemedicine.gateway.ts
// Signaling WebRTC via Socket.io — sem servidor de mídia, peer-to-peer puro
import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, MessageBody,
  ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService }     from '@nestjs/jwt';
import { PushService }    from '../push/push.service';
import { PrismaService }  from '../../common/prisma/prisma.service';

@WebSocketGateway({
  namespace: 'telemedicine',
  cors: { origin: '*', credentials: true },
})
export class TelemedicineGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // roomToken → Set<socketId>
  private roomSockets = new Map<string, Set<string>>();
  // socketId → { userId, roomToken, role }
  private socketMeta  = new Map<string, { userId?: string; roomToken: string; role: 'doctor' | 'patient' }>();

  constructor(
    private jwtService: JwtService,
    private pushService: PushService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth?.token as string)
        ?? (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');
      if (token) {
        const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET }) as any;
        (client as any).userId = payload.id ?? payload.sub;
      }
    } catch { /* paciente sem conta pode entrar sem token */ }
  }

  handleDisconnect(client: Socket) {
    const meta = this.socketMeta.get(client.id);
    if (meta) {
      const sockets = this.roomSockets.get(meta.roomToken);
      sockets?.delete(client.id);
      client.to(meta.roomToken).emit('peer_left', {
        socketId: client.id,
        role: meta.role,
      });
      this.socketMeta.delete(client.id);
    }
  }

  // ── Entrar na sala ────────────────────────────────────────────────────────
  @SubscribeMessage('join_room')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomToken: string; role: 'doctor' | 'patient'; displayName?: string },
  ) {
    const { roomToken, role, displayName } = data;
    client.join(roomToken);

    if (!this.roomSockets.has(roomToken)) this.roomSockets.set(roomToken, new Set());
    this.roomSockets.get(roomToken)!.add(client.id);
    this.socketMeta.set(client.id, { userId: (client as any).userId, roomToken, role });

    client.to(roomToken).emit('peer_joined', {
      socketId: client.id,
      role,
      displayName: displayName ?? (role === 'doctor' ? 'Médico' : 'Paciente'),
    });

    const peers = [...(this.roomSockets.get(roomToken) ?? [])].filter(id => id !== client.id);
    client.emit('room_peers', { peers });
  }

  // ── WebRTC: SDP Offer ─────────────────────────────────────────────────────
  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; sdp: any },
  ) {
    this.server.to(data.to).emit('offer', { from: client.id, sdp: data.sdp });
  }

  // ── WebRTC: SDP Answer ────────────────────────────────────────────────────
  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; sdp: any },
  ) {
    this.server.to(data.to).emit('answer', { from: client.id, sdp: data.sdp });
  }

  // ── WebRTC: ICE Candidate ─────────────────────────────────────────────────
  @SubscribeMessage('ice_candidate')
  handleIce(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; candidate: any },
  ) {
    this.server.to(data.to).emit('ice_candidate', { from: client.id, candidate: data.candidate });
  }

  // ── Médico admite o paciente ──────────────────────────────────────────────
  @SubscribeMessage('admit_patient')
  async handleAdmit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomToken: string },
  ) {
    this.server.to(data.roomToken).emit('patient_admitted', { roomToken: data.roomToken });

    // Push FCM para o paciente
    try {
      const room = await this.prisma.telemedicineRoom.findUnique({
        where: { token: data.roomToken },
        select: { patientId: true, doctor: { select: { fullName: true } } },
      });
      if (room?.patientId) {
        await this.pushService.sendToUser(room.patientId, {
          title: '🩺 Médico disponível',
          body:  `${room.doctor?.fullName ?? 'Seu médico'} está pronto para te atender. Entre na videochamada!`,
          data:  { type: 'telemedicine_admit', roomToken: data.roomToken },
        });
      }
    } catch { /* não bloqueia o fluxo WebSocket */ }
  }

  // ── Encerrar chamada ──────────────────────────────────────────────────────
  @SubscribeMessage('end_call')
  handleEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomToken: string },
  ) {
    this.server.to(data.roomToken).emit('call_ended', {});
  }

  // ── Chat de texto durante a consulta ─────────────────────────────────────
  @SubscribeMessage('chat_message')
  handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomToken: string; text: string; senderName: string },
  ) {
    this.server.to(data.roomToken).emit('chat_message', {
      from:       client.id,
      senderName: data.senderName,
      text:       data.text,
      time:       new Date().toISOString(),
    });
  }
}
