import { Injectable } from '@nestjs/common';
import { PresenceRepository } from '../../application/repositories/presence.repository';
import { PrismaService } from '../prisma.service';
import { PresenceStatus } from '../../domain/models/types';

@Injectable()
export class PrismaPresenceRepository implements PresenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertPresence(userId: string, status: PresenceStatus, lastEventAt: Date): Promise<void> {
    await this.prisma.userPresence.upsert({
      where: { userId },
      update: { status, lastEventAt },
      create: { userId, status, lastEventAt }
    });
  }

  async getPresence(userId: string): Promise<{ status: PresenceStatus; lastEventAt: Date } | null> {
    const presence = await this.prisma.userPresence.findUnique({
      where: { userId },
      select: { status: true, lastEventAt: true }
    });
    if (!presence) {
      return null;
    }
    return { status: presence.status, lastEventAt: presence.lastEventAt };
  }
}
