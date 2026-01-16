import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../../application/services/chat.service';
import { PresenceService } from '../../application/services/presence.service';
import { ChannelType, PresenceStatus } from '../../domain/models/types';

interface ClientCommand<T> {
  type: string;
  payload: T;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly socketUsers = new Map<string, string>();

  constructor(
    private readonly chatService: ChatService,
    private readonly presenceService: PresenceService
  ) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.auth?.userId as string | undefined;
    if (userId) {
      this.socketUsers.set(client.id, userId);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    if (userId) {
      await this.presenceService.markOffline(userId);
      this.socketUsers.delete(client.id);
    }
  }

  @SubscribeMessage('command')
  async handleCommand(
    @MessageBody() message: ClientCommand<Record<string, unknown>>,
    @ConnectedSocket() client: Socket
  ) {
    switch (message.type) {
      case 'create_channel':
        return this.handleCreateChannel(message as ClientCommand<{ channelType: ChannelType; memberIds: string[] }>, client);
      case 'send_message':
        return this.handleSendMessage(
          message as ClientCommand<{ channelId: string; body: string; clientMessageId: string }>,
          client
        );
      case 'join_channel':
        return this.handleJoinChannel(message as ClientCommand<{ channelId: string }>, client);
      case 'leave_channel':
        return this.handleLeaveChannel(message as ClientCommand<{ channelId: string }>, client);
      case 'heartbeat':
        return this.handleHeartbeat(message as ClientCommand<{ userId: string; status: PresenceStatus }>, client);
      default:
        return { type: 'error', payload: { message: 'unknown_command' } };
    }
  }

  private async handleCreateChannel(
    command: ClientCommand<{ channelType: ChannelType; memberIds: string[] }>,
    client: Socket
  ) {
    const channel = await this.chatService.createChannel(command.payload.channelType, command.payload.memberIds);
    client.emit('event', {
      type: 'channel_created',
      payload: { channelId: channel.id, createdAt: channel.createdAt.toISOString() }
    });
  }

  private async handleSendMessage(
    command: ClientCommand<{ channelId: string; body: string; clientMessageId: string }>,
    client: Socket
  ) {
    const senderId = this.socketUsers.get(client.id) || (client.handshake.auth?.userId as string | undefined);
    if (!senderId) {
      client.emit('event', { type: 'error', payload: { message: 'missing_user' } });
      return;
    }
    const message = await this.chatService.sendMessage({
      channelId: command.payload.channelId,
      senderId,
      body: command.payload.body,
      clientMessageId: command.payload.clientMessageId
    });

    client.emit('event', {
      type: 'message_sent',
      payload: {
        channelId: message.channelId,
        messageId: message.id,
        senderId: message.senderId,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        seq: message.seq
      }
    });

    client.to(command.payload.channelId).emit('event', {
      type: 'message_received',
      payload: {
        channelId: message.channelId,
        messageId: message.id,
        senderId: message.senderId,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        seq: message.seq
      }
    });
  }

  private async handleJoinChannel(command: ClientCommand<{ channelId: string }>, client: Socket) {
    const userId = this.socketUsers.get(client.id) || (client.handshake.auth?.userId as string | undefined);
    if (!userId) {
      client.emit('event', { type: 'error', payload: { message: 'missing_user' } });
      return;
    }
    await this.chatService.joinChannel(command.payload.channelId, userId);
    await client.join(command.payload.channelId);
    client.emit('event', {
      type: 'channel_joined',
      payload: { channelId: command.payload.channelId }
    });
  }

  private async handleLeaveChannel(command: ClientCommand<{ channelId: string }>, client: Socket) {
    const userId = this.socketUsers.get(client.id) || (client.handshake.auth?.userId as string | undefined);
    if (!userId) {
      client.emit('event', { type: 'error', payload: { message: 'missing_user' } });
      return;
    }
    await this.chatService.leaveChannel(command.payload.channelId, userId);
    await client.leave(command.payload.channelId);
    client.emit('event', {
      type: 'channel_left',
      payload: { channelId: command.payload.channelId }
    });
  }

  private async handleHeartbeat(
    command: ClientCommand<{ userId: string; status: PresenceStatus }>,
    client: Socket
  ) {
    const userId = command.payload.userId;
    await this.presenceService.heartbeat(userId, command.payload.status);
    this.server.emit('event', {
      type: 'presence_updated',
      payload: { userId, status: command.payload.status, lastEventAt: new Date().toISOString() }
    });
  }
}
