import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyId, CurrentUser } from '../../../common/decorators';

@Controller('crm/activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  findAll(
    @CompanyId() companyId: string,
    @Query() query: any,
  ) {
    return this.activitiesService.findAll(companyId, query);
  }

  @Get('today')
  today(
    @CompanyId() companyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.activitiesService.getTodayActivities(companyId, userId);
  }

  @Post()
  create(
    @CompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.activitiesService.create(companyId, userId, dto);
  }

  @Patch(':id/done')
  markDone(
    @CompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.activitiesService.markDone(companyId, id);
  }
}