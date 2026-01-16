import { Injectable } from '@nestjs/common';
import { ChatRepository, CreateChannelInput, MessageInput, MessageRecord } from '../../application/repositories/chat.repository';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaChatRepository implements ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createChannel(input: CreateChannelInput): Promise<{ id: string; createdAt: Date }> {
    const channel = await this.prisma.channel.create({
      data: {
        type: input.type,
        memberships: {
          create: input.memberIds.map((userId) => ({ userId }))
        }
      }
    });
    return { id: channel.id, createdAt: channel.createdAt };
  }

  async addMembership(channelId: string, userId: string): Promise<void> {
    await this.prisma.membership.create({
      data: { channelId, userId }
    });
  }

  async removeMembership(channelId: string, userId: string): Promise<void> {
    await this.prisma.membership.delete({
      where: { userId_channelId: { userId, channelId } }
    });
  }

  async listChannelMembers(channelId: string): Promise<string[]> {
    const members = await this.prisma.membership.findMany({
      where: { channelId },
      select: { userId: true }
    });
    return members.map((member) => member.userId);
  }

  async saveMessage(input: MessageInput): Promise<MessageRecord> {
    const last = await this.prisma.message.findFirst({
      where: { channelId: input.channelId },
      orderBy: { seq: 'desc' },
      select: { seq: true }
    });
    const nextSeq = (last?.seq ?? 0) + 1;
    const message = await this.prisma.message.create({
      data: {
        channelId: input.channelId,
        senderId: input.senderId,
        body: input.body,
        seq: nextSeq,
        clientMessageId: input.clientMessageId,
        status: 'sent'
      }
    });
    return {
      id: message.id,
      channelId: message.channelId,
      senderId: message.senderId,
      body: message.body,
      createdAt: message.createdAt,
      seq: message.seq
    };
  }
}
