import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../application/repositories/user.repository';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(userId: string): Promise<{ id: string; name: string } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true }
    });
  }
}
