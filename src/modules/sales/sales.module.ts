import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { QuotationsController } from './quotations/quotations.controller';
import { QuotationsService } from './quotations/quotations.service';
import { OrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';
import { MarginEngine } from './quotations/margin.engine';

@Module({
  imports: [CoreModule],
  controllers: [QuotationsController, OrdersController],
  providers: [QuotationsService, OrdersService, MarginEngine],
  exports: [QuotationsService, OrdersService],
})
export class SalesModule {}