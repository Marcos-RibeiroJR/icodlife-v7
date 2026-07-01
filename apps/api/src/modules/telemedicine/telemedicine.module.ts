// apps/api/src/modules/telemedicine/telemedicine.module.ts
import { Module }                  from '@nestjs/common';
import { JwtModule }               from '@nestjs/jwt';
import { PrismaModule }            from '../../common/prisma/prisma.module';
import { PushModule }              from '../push/push.module';
import { TelemedicineService }     from './telemedicine.service';
import { TelemedicineController }  from './telemedicine.controller';
import { TelemedicineGateway }     from './telemedicine.gateway';

@Module({
  imports: [
    PrismaModule,
    PushModule,
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  providers:   [TelemedicineService, TelemedicineGateway],
  controllers: [TelemedicineController],
  exports:     [TelemedicineService],
})
export class TelemedicineModule {}
