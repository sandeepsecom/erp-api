import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('vendors')
@UseGuards(JwtAuthGuard)
export class VendorsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: any, @Query() query: any) {
    const { search } = query;
    const where: any = { companyId: user.activeCompanyId, deletedAt: null, isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    const data = await this.prisma.vendor.findMany({ where, orderBy: { name: 'asc' } });
    return { data };
  }

  @Get(':id')
  async get(@CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.prisma.vendor.findFirst({
      where: { id, companyId: user.activeCompanyId, deletedAt: null },
    });
    return { data };
  }

  @Post()
  async create(@CurrentUser() user: any, @Body() body: any) {
    const data = await this.prisma.vendor.create({
      data: {
        companyId: user.activeCompanyId,
        name: body.name,
        contactPerson: body.contactPerson || null,
        email: body.email || null,
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
        gstin: body.gstin || null,
        pan: body.pan || null,
        addressLine1: body.addressLine1 || null,
        city: body.city || null,
        state: body.state || null,
        pincode: body.pincode || null,
        bankName: body.bankName || null,
        bankAccountNumber: body.bankAccountNumber || null,
        bankIfsc: body.bankIfsc || null,
        bankAccountName: body.bankAccountName || null,
        bankBranch: body.bankBranch || null,
        notes: body.notes || null,
      },
    });
    return { data };
  }

  @Put(':id')
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    const data = await this.prisma.vendor.update({
      where: { id },
      data: {
        name: body.name,
        contactPerson: body.contactPerson || null,
        email: body.email || null,
        phone: body.phone || null,
        whatsapp: body.whatsapp || null,
        gstin: body.gstin || null,
        pan: body.pan || null,
        addressLine1: body.addressLine1 || null,
        city: body.city || null,
        state: body.state || null,
        pincode: body.pincode || null,
        bankName: body.bankName || null,
        bankAccountNumber: body.bankAccountNumber || null,
        bankIfsc: body.bankIfsc || null,
        bankAccountName: body.bankAccountName || null,
        bankBranch: body.bankBranch || null,
        notes: body.notes || null,
      },
    });
    return { data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.prisma.vendor.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    return { data: { success: true } };
  }
}
