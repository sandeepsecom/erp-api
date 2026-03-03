import { Controller, Get, UseGuards } from '@nestjs/common';
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
}