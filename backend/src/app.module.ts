import { Module } from '@nestjs/common';
import { ChatGateway } from './interfaces/ws/chat.gateway';
import { PrismaService } from './infra/prisma.service';
import { ChatService } from './application/services/chat.service';
import { PresenceService } from './application/services/presence.service';
import { UserService } from './application/services/user.service';
import { ChatRepository } from './application/repositories/chat.repository';
import { PresenceRepository } from './application/repositories/presence.repository';
import { UserRepository } from './application/repositories/user.repository';
import { PrismaChatRepository } from './infra/repositories/prisma-chat.repository';
import { PrismaPresenceRepository } from './infra/repositories/prisma-presence.repository';
import { PrismaUserRepository } from './infra/repositories/prisma-user.repository';
import { KafkaBus } from './infra/services/kafka-bus';

@Module({
  imports: [],
  controllers: [],
  providers: [
    ChatGateway,
    PrismaService,
    KafkaBus,
    ChatService,
    PresenceService,
    UserService,
    { provide: ChatRepository, useClass: PrismaChatRepository },
    { provide: PresenceRepository, useClass: PrismaPresenceRepository },
    { provide: UserRepository, useClass: PrismaUserRepository }
  ],
})
export class AppModule {}
