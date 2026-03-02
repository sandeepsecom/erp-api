import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('products')
export class ProductsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query() query: any) {
    const { search, limit = 100 } = query;
    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    const data = await this.prisma.product.findMany({
      where,
      take: Number(limit),
      orderBy: { name: 'asc' },
    });
    return { data };
  }
}