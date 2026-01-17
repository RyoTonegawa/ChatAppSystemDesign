import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private presenceClient: Redis | null = null;
  private chatClient: Redis | null = null;

  onModuleInit() {
    const presenceUrl = process.env.PRESENCE_REDIS_URL || 'redis://localhost:6379/0';
    const chatUrl = process.env.CHAT_REDIS_URL || 'redis://localhost:6380/0';
    this.presenceClient = new Redis(presenceUrl);
    this.chatClient = new Redis(chatUrl);
  }

  onModuleDestroy() {
    if (this.presenceClient) {
      this.presenceClient.disconnect();
    }
    if (this.chatClient) {
      this.chatClient.disconnect();
    }
  }

  getPresenceClient(): Redis {
    if (!this.presenceClient) {
      throw new Error('Presence Redis client not initialized');
    }
    return this.presenceClient;
  }

  getChatClient(): Redis {
    if (!this.chatClient) {
      throw new Error('Chat Redis client not initialized');
    }
    return this.chatClient;
  }
}
