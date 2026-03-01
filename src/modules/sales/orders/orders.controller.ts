import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CompanyId } from '../../../common/decorators';

@Controller('sales/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(
    @CompanyId() companyId: string,
    @Query() query: any,
  ) {
    return this.ordersService.findAll(companyId, query);
  }

  @Get(':id')
  findOne(
    @CompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.findOne(companyId, id);
  }

  @Patch(':id/done')
  done(
    @CompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.done(companyId, id);
  }

  @Patch(':id/cancel')
  cancel(
    @CompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.cancel(companyId, id);
  }
}