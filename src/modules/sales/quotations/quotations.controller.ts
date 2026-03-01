import {
  Controller, Get, Post, Put, Patch, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CompanyId, CurrentUser, Roles } from '../../../common/decorators';

@Controller('sales/quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Get()
  findAll(
    @CompanyId() companyId: string,
    @Query() query: any,
  ) {
    return this.quotationsService.findAll(companyId, query);
  }

  @Get(':id')
  findOne(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Query('margin') showMargin: string,
    @CurrentUser('role') role: string,
  ) {
    const canSeeMargin = ['ADMIN', 'MANAGER'].includes(role) && showMargin === 'true';
    return this.quotationsService.findOne(companyId, id, canSeeMargin);
  }

  @Get(':id/profitability')
  @Roles('ADMIN', 'MANAGER')
  profitability(
    @CompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.quotationsService.getProfitability(companyId, id);
  }

  @Post()
  create(
    @CompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.quotationsService.create(companyId, userId, dto);
  }

  @Put(':id')
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.quotationsService.update(companyId, id, dto);
  }

  @Patch(':id/send')
  send(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.quotationsService.send(companyId, id, userId);
  }

  @Patch(':id/confirm')
  confirm(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.quotationsService.confirm(companyId, id, userId);
  }

  @Patch(':id/cancel')
  cancel(
    @CompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.quotationsService.cancel(companyId, id);
  }
}