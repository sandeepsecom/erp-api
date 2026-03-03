import { Module } from '@nestjs/common';
import { SequenceService } from './sequences/sequence.service';
import { CompanyController } from './company.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CompanyController],
  providers: [SequenceService],
  exports: [SequenceService],
})
export class CoreModule {}