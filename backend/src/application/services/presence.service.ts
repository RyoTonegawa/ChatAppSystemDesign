import { Inject, Injectable } from '@nestjs/common';
import { PresenceRepository } from '../repositories/presence.repository';
import { PresenceStatus } from '../../domain/models/types';
import { KafkaBus } from '../../infra/services/kafka-bus';

const OFFLINE_TIMEOUT_MS = 30_000;

@Injectable()
export class PresenceService {
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    @Inject(PresenceRepository) private readonly presenceRepository: PresenceRepository,
    private readonly kafkaBus: KafkaBus
  ) {}

  async heartbeat(userId: string, status: PresenceStatus) {
    const now = new Date();
    await this.presenceRepository.upsertPresence(userId, status, now);
    await this.kafkaBus.publish('presence.updated', {
      userId,
      status,
      lastEventAt: now.toISOString()
    });
    if (status === 'online') {
      this.resetOfflineTimer(userId);
    }
  }

  private resetOfflineTimer(userId: string) {
    const existing = this.timers.get(userId);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = setTimeout(async () => {
      await this.markOffline(userId);
    }, OFFLINE_TIMEOUT_MS);
    this.timers.set(userId, timer);
  }

  async markOffline(userId: string) {
    const now = new Date();
    await this.presenceRepository.upsertPresence(userId, 'offline', now);
    await this.kafkaBus.publish('presence.updated', {
      userId,
      status: 'offline',
      lastEventAt: now.toISOString()
    });
  }

  async getPresence(userId: string) {
    return this.presenceRepository.getPresence(userId);
  }
}
