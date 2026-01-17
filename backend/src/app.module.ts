import { Module } from '@nestjs/common';
import { ChatGateway } from './interfaces/ws/chat.gateway';
import { PrismaService } from './infra/prisma.service';
import { ChatService } from './application/services/chat.service';
import { PresenceService } from './application/services/presence.service';
import { UserService } from './application/services/user.service';
import { ChatRepository } from './application/repositories/chat.repository';
import { PresenceRepository } from './application/repositories/presence.repository';
import { UserRepository } from './application/repositories/user.repository';
import { PrismaUserRepository } from './infra/repositories/prisma-user.repository';
import { KafkaBus } from './infra/services/kafka-bus';
import { RedisService } from './infra/services/redis.service';
import { RedisChatRepository } from './infra/repositories/redis-chat.repository';
import { RedisPresenceRepository } from './infra/repositories/redis-presence.repository';

@Module({
  imports: [],
  controllers: [],
  providers: [
    ChatGateway,
    PrismaService,
    RedisService,
    KafkaBus,
    ChatService,
    PresenceService,
    UserService,
    { provide: ChatRepository, useClass: RedisChatRepository },
    { provide: PresenceRepository, useClass: RedisPresenceRepository },
    { provide: UserRepository, useClass: PrismaUserRepository }
  ],
})
export class AppModule {}
