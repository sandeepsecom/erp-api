import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: any, @Query() query: any) {
    const { search, category, isService, limit = 100 } = query;
    const where: any = { 
      companyId: user.activeCompanyId,
      deletedAt: null,
      isActive: true,
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (isService !== undefined) where.isService = isService === 'true';

    const data = await this.prisma.product.findMany({
      where,
      take: Number(limit),
      orderBy: { name: 'asc' },
    });
    return { data };
  }

  @Get('categories')
  async categories(@CurrentUser() user: any) {
    const products = await this.prisma.product.findMany({
      where: { companyId: user.activeCompanyId, deletedAt: null },
      select: { category: true },
      distinct: ['category'],
    });
    const cats = products.map((p) => p.category).filter(Boolean);
    return { data: cats };
  }

  @Get(':id')
  async get(@CurrentUser() user: any, @Param('id') id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, companyId: user.activeCompanyId, deletedAt: null },
      include: {
        serialNumbers: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    return { data: product };
  }

  @Post()
  async create(@CurrentUser() user: any, @Body() body: any) {
    const product = await this.prisma.product.create({
      data: {
        companyId: user.activeCompanyId,
        name: body.name,
        sku: body.sku || null,
        description: body.description || null,
        category: body.category || null,
        uom: body.uom || 'NOS',
        costPrice: body.costPrice || 0,
        salePrice: body.salePrice || 0,
        taxRate: body.outputTaxRate || 18,
        inputTaxRate: body.inputTaxRate || 18,
        outputTaxRate: body.outputTaxRate || 18,
        hsnCode: body.hsnCode || null,
        sacCode: body.sacCode || null,
        isStorable: body.isStorable ?? true,
        isService: body.isService ?? false,
        trackSerial: body.trackSerial ?? false,
        currentStock: body.currentStock || 0,
        datasheetUrl: body.datasheetUrl || null,
      },
    });
    return { data: product };
  }

  @Put(':id')
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        sku: body.sku || null,
        description: body.description || null,
        category: body.category || null,
        uom: body.uom || 'NOS',
        costPrice: body.costPrice || 0,
        salePrice: body.salePrice || 0,
        taxRate: body.outputTaxRate || 18,
        inputTaxRate: body.inputTaxRate || 18,
        outputTaxRate: body.outputTaxRate || 18,
        hsnCode: body.hsnCode || null,
        sacCode: body.sacCode || null,
        isStorable: body.isStorable ?? true,
        isService: body.isService ?? false,
        trackSerial: body.trackSerial ?? false,
        datasheetUrl: body.datasheetUrl || null,
      },
    });
    return { data: product };
  }

  @Delete(':id')
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { data: { success: true } };
  }

  // Serial Numbers
  @Get(':id/serials')
  async listSerials(@CurrentUser() user: any, @Param('id') id: string, @Query() query: any) {
    const { status } = query;
    const where: any = { productId: id, companyId: user.activeCompanyId };
    if (status) where.status = status;
    const serials = await this.prisma.serialNumber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return { data: serials };
  }

  @Post(':id/serials')
  async addSerials(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    const serialNos: string[] = body.serialNumbers || [body.serialNo];
    const created = [];
    for (const serialNo of serialNos) {
      if (!serialNo?.trim()) continue;
      try {
        const serial = await this.prisma.serialNumber.create({
          data: {
            productId: id,
            companyId: user.activeCompanyId,
            serialNo: serialNo.trim(),
            status: 'IN_STOCK',
            notes: body.notes || null,
          },
        });
        created.push(serial);
        // Update stock count
        await this.prisma.product.update({
          where: { id },
          data: { currentStock: { increment: 1 } },
        });
      } catch (err: any) {
        // Skip duplicates
      }
    }
    return { data: created };
  }

  @Patch(':id/serials/:serialId')
  async updateSerial(
    @Param('id') id: string,
    @Param('serialId') serialId: string,
    @Body() body: any,
  ) {
    const serial = await this.prisma.serialNumber.update({
      where: { id: serialId },
      data: {
        status: body.status,
        notes: body.notes,
        orderId: body.orderId || null,
        contactId: body.contactId || null,
      },
    });
    // Update stock count based on status change
    if (body.status === 'SOLD' || body.status === 'DISPATCHED') {
      await this.prisma.product.update({
        where: { id },
        data: { currentStock: { decrement: 1 } },
      });
    }
    return { data: serial };
  }
}