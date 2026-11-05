import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/whatsapp',
})
export class WhatsappGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WhatsappGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug(`[WebSocket] Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`[WebSocket] Cliente desconectado: ${client.id}`);
  }

  emitMessageCreated(payload: any) {
    this.server?.emit('whatsapp:message:created', payload);
  }

  emitMessageStatus(payload: any) {
    this.server?.emit('whatsapp:message:status', payload);
  }

  emitConversationUpdated(payload: any) {
    this.server?.emit('whatsapp:conversation:updated', payload);
  }
}
