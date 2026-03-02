import { Controller, Get, Post, Put, Patch, Body, Param, Query } from '@nestjs/common';
import { AmcService } from './amc.service';

@Controller('amc')
export class AmcController {
  constructor(private amc: AmcService) {}

  @Get()
  list(@Query() query: any) {
    return this.amc.list(query);
  }

  @Get('summary')
  summary() {
    return this.amc.summary();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.amc.get(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.amc.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.amc.update(id, body);
  }

  @Patch(':id/renew')
  renew(@Param('id') id: string, @Body() body: any) {
    return this.amc.renew(id, body);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.amc.cancel(id);
  }
}