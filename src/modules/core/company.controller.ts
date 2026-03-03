import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('core/company')
@UseGuards(JwtAuthGuard)
export class CompanyController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getMyCompany(@CurrentUser() user: any) {
    const company = await this.prisma.company.findUnique({
      where: { id: user.activeCompanyId },
    });
    return { data: company };
  }

  @Patch()
  async updateMyCompany(@CurrentUser() user: any, @Body() body: any) {
    const allowed = [
      'legalName', 'gstin', 'pan', 'phone', 'email', 'logoUrl',
      'addressLine1', 'city', 'state', 'pincode', 'country',
      'bankName', 'bankAccountNumber', 'bankIfsc', 'bankAccountName', 'bankBranch',
    ];
    const data: any = {};
    allowed.forEach((key) => { if (body[key] !== undefined) data[key] = body[key]; });

    const company = await this.prisma.company.update({
      where: { id: user.activeCompanyId },
      data,
    });
    return { data: company };
  }
}