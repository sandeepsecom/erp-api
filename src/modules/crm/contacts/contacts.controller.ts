import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser, CompanyId, Roles } from '../../../common/decorators';

@Controller('crm/contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll(
    @CompanyId() companyId: string,
    @Query() query: any,
  ) {
    return this.contactsService.findAll(companyId, query);
  }

  @Get(':id')
  findOne(
    @CompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.contactsService.findOne(companyId, id);
  }

  @Post()
  create(
    @CompanyId() companyId: string,
    @Body() dto: any,
  ) {
    return this.contactsService.create(companyId, dto);
  }

  @Put(':id')
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.contactsService.update(companyId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'MANAGER')
  remove(
    @CompanyId() companyId: string,
    @Param('id') id: string,
  ) {
    return this.contactsService.remove(companyId, id);
  }
}