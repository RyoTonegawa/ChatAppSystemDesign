import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ChatRepository, CreateChannelInput, MessageInput, MessageRecord } from '../../application/repositories/chat.repository';
import { RedisService } from '../services/redis.service';

@Injectable()
export class RedisChatRepository implements ChatRepository {
  constructor(private readonly redisService: RedisService) {}

  async createChannel(input: CreateChannelInput): Promise<{ id: string; createdAt: Date }> {
    const client = this.redisService.getChatClient();
    const channelId = randomUUID();
    const createdAt = new Date();

    const channelKey = `channel:${channelId}`;
    await client.hset(channelKey, {
      id: channelId,
      type: input.type,
      createdAt: createdAt.toISOString()
    });

    const memberSetKey = `channel:${channelId}:members`;
    if (input.memberIds.length > 0) {
      await client.sadd(memberSetKey, ...input.memberIds);
      for (const userId of input.memberIds) {
        await client.sadd(`user:${userId}:channels`, channelId);
      }
    }

    return { id: channelId, createdAt };
  }

  async addMembership(channelId: string, userId: string): Promise<void> {
    const client = this.redisService.getChatClient();
    await client.sadd(`channel:${channelId}:members`, userId);
    await client.sadd(`user:${userId}:channels`, channelId);
  }

  async removeMembership(channelId: string, userId: string): Promise<void> {
    const client = this.redisService.getChatClient();
    await client.srem(`channel:${channelId}:members`, userId);
    await client.srem(`user:${userId}:channels`, channelId);
  }

  async listChannelMembers(channelId: string): Promise<string[]> {
    const client = this.redisService.getChatClient();
    return client.smembers(`channel:${channelId}:members`);
  }

  async saveMessage(input: MessageInput): Promise<MessageRecord> {
    const client = this.redisService.getChatClient();
    const idempotencyKey = `channel:${input.channelId}:client:${input.clientMessageId}`;
    const existing = await client.hgetall(idempotencyKey);
    if (existing && existing.id) {
      return {
        id: existing.id,
        channelId: existing.channelId,
        senderId: existing.senderId,
        body: existing.body,
        createdAt: new Date(existing.createdAt),
        seq: Number(existing.seq)
      };
    }

    const seq = await client.incr(`channel:${input.channelId}:seq`);
    const messageId = input.clientMessageId || randomUUID();
    const createdAt = new Date();
    const messageKey = `channel:${input.channelId}:message:${seq}`;

    await client.hset(messageKey, {
      id: messageId,
      channelId: input.channelId,
      senderId: input.senderId,
      body: input.body,
      createdAt: createdAt.toISOString(),
      seq: String(seq)
    });

    await client.rpush(`channel:${input.channelId}:messages`, messageKey);
    await client.hset(idempotencyKey, {
      id: messageId,
      channelId: input.channelId,
      senderId: input.senderId,
      body: input.body,
      createdAt: createdAt.toISOString(),
      seq: String(seq)
    });

    return {
      id: messageId,
      channelId: input.channelId,
      senderId: input.senderId,
      body: input.body,
      createdAt,
      seq
    };
  }
}
