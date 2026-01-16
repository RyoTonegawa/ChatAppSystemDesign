import { Inject, Injectable } from '@nestjs/common';
import { ChatRepository, MessageRecord } from '../repositories/chat.repository';
import { ChannelType } from '../../domain/models/types';
import { KafkaBus } from '../../infra/services/kafka-bus';

@Injectable()
export class ChatService {
  constructor(
    @Inject(ChatRepository) private readonly chatRepository: ChatRepository,
    private readonly kafkaBus: KafkaBus
  ) {}

  async createChannel(channelType: ChannelType, memberIds: string[]) {
    if (channelType === 'direct' && memberIds.length !== 2) {
      throw new Error('direct channel must have exactly 2 members');
    }
    if (channelType === 'group' && memberIds.length > 50) {
      throw new Error('group channel max 50 members');
    }
    const channel = await this.chatRepository.createChannel({ type: channelType, memberIds });
    await this.kafkaBus.publish('channel.created', {
      channelId: channel.id,
      memberIds,
      createdAt: channel.createdAt.toISOString()
    });
    return channel;
  }

  async joinChannel(channelId: string, userId: string) {
    await this.chatRepository.addMembership(channelId, userId);
    await this.kafkaBus.publish('channel.member.joined', { channelId, userId });
  }

  async leaveChannel(channelId: string, userId: string) {
    await this.chatRepository.removeMembership(channelId, userId);
    await this.kafkaBus.publish('channel.member.left', { channelId, userId });
  }

  async sendMessage(input: {
    channelId: string;
    senderId: string;
    body: string;
    clientMessageId: string;
  }): Promise<MessageRecord> {
    if (input.body.length > 1000) {
      throw new Error('message body too long');
    }
    const message = await this.chatRepository.saveMessage(input);
    await this.kafkaBus.publish('message.sent', {
      channelId: message.channelId,
      messageId: message.id,
      senderId: message.senderId,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      seq: message.seq
    });
    return message;
  }

  async listMembers(channelId: string) {
    return this.chatRepository.listChannelMembers(channelId);
  }
}
