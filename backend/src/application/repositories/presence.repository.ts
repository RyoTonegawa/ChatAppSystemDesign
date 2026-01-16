import { PresenceStatus } from '../../domain/models/types';

export abstract class PresenceRepository {
  abstract upsertPresence(userId: string, status: PresenceStatus, lastEventAt: Date): Promise<void>;
  abstract getPresence(userId: string): Promise<{ status: PresenceStatus; lastEventAt: Date } | null>;
}
