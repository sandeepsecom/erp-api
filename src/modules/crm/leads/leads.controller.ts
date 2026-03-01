import {
  Controller, Get, Post, Put, Patch, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser, CompanyId } from '../../../common/decorators';

@Controller('crm/leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  findAll(
    @CompanyId() companyId: string,
    @Query() query: any,
  ) {
    return this.leadsService.findAll(companyId, query);
  }

  @Get('pipeline-summary')
  pipelineSummary(@CompanyId() companyId: string) {
    return this.leadsService.getPipelineSummary(companyId);
  }

  @Get(':id')
  findOne(
    @CompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.leadsService.findOne(companyId, id);
  }

  @Post()
  create(
    @CompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.leadsService.create(companyId, userId, dto);
  }

  @Put(':id')
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.leadsService.update(companyId, id, dto);
  }

  @Patch(':id/stage')
  moveStage(
    @CompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.leadsService.moveStage(companyId, id, userId, dto);
  }
}