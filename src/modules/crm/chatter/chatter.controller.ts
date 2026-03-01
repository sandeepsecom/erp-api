import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ChatterService } from './chatter.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CompanyId, CurrentUser } from '../../../common/decorators';

@Controller('chatter/:model/:id')
@UseGuards(JwtAuthGuard)
export class ChatterController {
  constructor(private readonly chatterService: ChatterService) {}

  @Get()
  getMessages(
    @CompanyId() companyId: string,
    @Param('model') refModel: string,
    @Param('id') refId: string,
  ) {
    return this.chatterService.getMessages(companyId, refModel, refId);
  }

  @Post()
  postMessage(
    @CompanyId() companyId: string,
    @CurrentUser('id') userId: string,
    @Param('model') refModel: string,
    @Param('id') refId: string,
    @Body() dto: any,
  ) {
    return this.chatterService.postMessage(companyId, userId, refModel, refId, dto);
  }
}