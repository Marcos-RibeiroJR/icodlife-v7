// apps/api/src/modules/chat/chat.gateway.ts
import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, MessageBody,
  ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService }     from '@nestjs/jwt';
import { ChatService }    from './chat.service';

@WebSocketGateway({
  namespace: 'chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // userId → Set<socketId> para rastrear presença
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private chatService: ChatService,
    private jwtService:  JwtService,
  ) {}

  // ── Conexão ───────────────────────────────────────────────────────────────
  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth?.token as string)
        ?? (client.handshake.headers?.authorization as string)?.replace('Bearer ', '');

      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      }) as any;
      const userId = payload.id ?? payload.sub;
      if (!userId) { client.disconnect(); return; }

      // Armazena userId no socket
      (client as any).userId = userId;

      // Registra presença
      if (!this.userSockets.has(userId)) this.userSockets.set(userId, new Set());
      this.userSockets.get(userId)!.add(client.id);

    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId as string | undefined;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      sockets?.delete(client.id);
      if (sockets?.size === 0) this.userSockets.delete(userId);
    }
  }

  // ── Entrar numa sala ──────────────────────────────────────────────────────
  @SubscribeMessage('join_room')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = (client as any).userId;
    if (!userId) return;

    const hasAccess = await this.chatService.verifyAccess(data.roomId, userId);
    if (!hasAccess) { client.emit('error', { message: 'Acesso negado à sala' }); return; }

    client.join(data.roomId);
    await this.chatService.markRead(data.roomId, userId);
    client.emit('joined', { roomId: data.roomId });
  }

  // ── Enviar mensagem ───────────────────────────────────────────────────────
  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; body: string },
  ) {
    const userId = (client as any).userId;
    if (!userId || !data.body?.trim()) return;

    const hasAccess = await this.chatService.verifyAccess(data.roomId, userId);
    if (!hasAccess) return;

    const msg = await this.chatService.saveMessage(data.roomId, userId, data.body.trim());

    // Emite para todos na sala (incluindo remetente)
    this.server.to(data.roomId).emit('new_message', msg);
  }

  // ── Marcar como lida ──────────────────────────────────────────────────────
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = (client as any).userId;
    if (!userId) return;
    await this.chatService.markRead(data.roomId, userId);
    this.server.to(data.roomId).emit('messages_read', { roomId: data.roomId, userId });
  }

  // ── Carregar histórico ────────────────────────────────────────────────────
  @SubscribeMessage('load_history')
  async handleHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; before?: string },
  ) {
    const userId = (client as any).userId;
    if (!userId) return;
    const hasAccess = await this.chatService.verifyAccess(data.roomId, userId);
    if (!hasAccess) return;
    const messages = await this.chatService.getMessages(data.roomId, data.before);
    client.emit('history', { roomId: data.roomId, messages });
  }
}
