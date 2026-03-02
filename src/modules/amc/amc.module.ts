import { Module } from '@nestjs/common';
import { AmcController } from './amc.controller';
import { AmcService } from './amc.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AmcController],
  providers: [AmcService],
})
export class AmcModule {}