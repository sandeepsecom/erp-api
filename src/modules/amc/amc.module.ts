import { Module } from '@nestjs/common';
import { AmcController } from './amc.controller';
import { AmcService } from './amc.service';
import { AmcReminderService } from './amc-reminder.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { EmailService } from '../../common/email/email.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [PrismaModule],
  controllers: [AmcController],
  providers: [AmcService, AmcReminderService, EmailService],
})
export class AmcModule {}