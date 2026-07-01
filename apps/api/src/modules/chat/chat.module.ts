// apps/api/src/modules/chat/chat.module.ts
import { Module }       from '@nestjs/common';
import { JwtModule }    from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService }   from './chat.service';
import { ChatGateway }   from './chat.gateway';
import { ChatController } from './chat.controller';
import { PrismaModule }  from '../../common/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [ChatController],
  providers:   [ChatGateway, ChatService],
  exports:     [ChatService],
})
export class ChatModule {}
