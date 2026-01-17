import { Injectable } from '@nestjs/common';
import { PresenceRepository } from '../../application/repositories/presence.repository';
import { PresenceStatus } from '../../domain/models/types';
import { RedisService } from '../services/redis.service';

@Injectable()
export class RedisPresenceRepository implements PresenceRepository {
  constructor(private readonly redisService: RedisService) {}

  async upsertPresence(userId: string, status: PresenceStatus, lastEventAt: Date): Promise<void> {
    const client = this.redisService.getPresenceClient();
    await client.hset(`presence:${userId}`, {
      status,
      lastEventAt: lastEventAt.toISOString()
    });
  }

  async getPresence(userId: string): Promise<{ status: PresenceStatus; lastEventAt: Date } | null> {
    const client = this.redisService.getPresenceClient();
    const data = await client.hgetall(`presence:${userId}`);
    if (!data || !data.status || !data.lastEventAt) {
      return null;
    }
    return {
      status: data.status as PresenceStatus,
      lastEventAt: new Date(data.lastEventAt)
    };
  }
}
