import { Module } from '@nestjs/common';
import { VendorsController } from './vendors.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VendorsController],
})
export class VendorsModule {}
