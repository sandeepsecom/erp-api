import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrdersController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: any, @Query() query: any) {
    const { status, vendorId, salesOrderId } = query;
    const where: any = { companyId: user.activeCompanyId, deletedAt: null };
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;
    if (salesOrderId) where.salesOrderId = salesOrderId;
    const data = await this.prisma.purchaseOrder.findMany({
      where,
      include: { vendor: true, salesOrder: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { data };
  }

  @Get(':id')
  async get(@CurrentUser() user: any, @Param('id') id: string) {
    const data = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId: user.activeCompanyId, deletedAt: null },
      include: {
        vendor: true,
        salesOrder: { select: { id: true, name: true, contact: { select: { firstName: true, lastName: true, companyName: true } } } },
        amcContract: { select: { id: true, contractNumber: true } },
        lines: { include: { product: true }, orderBy: { sequence: 'asc' } },
      },
    });
    return { data };
  }

  @Post()
  async create(@CurrentUser() user: any, @Body() body: any) {
    const companyId = user.activeCompanyId;
    
    // Generate PO number
    const count = await this.prisma.purchaseOrder.count({ where: { companyId } });
    const poNumber = `PO/${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}/${String(count + 1).padStart(4, '0')}`;

    const lines = body.lines || [];
    let subtotal = 0, taxAmount = 0;
    for (const line of lines) {
      const lineSubtotal = Number(line.qty) * Number(line.unitPrice);
      const lineTax = lineSubtotal * (Number(line.taxPct) / 100);
      line.subtotal = lineSubtotal;
      line.taxAmount = lineTax;
      line.lineTotal = lineSubtotal + lineTax;
      subtotal += lineSubtotal;
      taxAmount += lineTax;
    }

    const data = await this.prisma.purchaseOrder.create({
      data: {
        companyId,
        name: poNumber,
        vendorId: body.vendorId,
        salesOrderId: body.salesOrderId || null,
        amcContractId: body.amcContractId || null,
        status: 'DRAFT',
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        notes: body.notes || null,
        subtotal,
        taxAmount,
        totalAmount: subtotal + taxAmount,
        lines: {
          create: lines.map((line: any, i: number) => ({
            productId: line.productId || null,
            sequence: (i + 1) * 10,
            description: line.description,
            qty: line.qty,
            uom: line.uom || 'NOS',
            unitPrice: line.unitPrice,
            taxPct: line.taxPct || 18,
            subtotal: line.subtotal,
            taxAmount: line.taxAmount,
            lineTotal: line.lineTotal,
          })),
        },
      },
      include: { vendor: true, lines: true },
    });
    return { data };
  }

  @Put(':id')
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    const lines = body.lines || [];
    let subtotal = 0, taxAmount = 0;
    for (const line of lines) {
      const lineSubtotal = Number(line.qty) * Number(line.unitPrice);
      const lineTax = lineSubtotal * (Number(line.taxPct) / 100);
      line.subtotal = lineSubtotal;
      line.taxAmount = lineTax;
      line.lineTotal = lineSubtotal + lineTax;
      subtotal += lineSubtotal;
      taxAmount += lineTax;
    }

    // Delete old lines and recreate
    await this.prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });

    const data = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        vendorId: body.vendorId,
        salesOrderId: body.salesOrderId || null,
        amcContractId: body.amcContractId || null,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        notes: body.notes || null,
        subtotal,
        taxAmount,
        totalAmount: subtotal + taxAmount,
        lines: {
          create: lines.map((line: any, i: number) => ({
            productId: line.productId || null,
            sequence: (i + 1) * 10,
            description: line.description,
            qty: line.qty,
            uom: line.uom || 'NOS',
            unitPrice: line.unitPrice,
            taxPct: line.taxPct || 18,
            subtotal: line.subtotal,
            taxAmount: line.taxAmount,
            lineTotal: line.lineTotal,
          })),
        },
      },
      include: { vendor: true, lines: true },
    });
    return { data };
  }

  @Patch(':id/status')
  async updateStatus(@CurrentUser() user: any, @Param('id') id: string, @Body() body: any) {
    const { status } = body;
    const updateData: any = { status };
    if (status === 'SENT') updateData.sentAt = new Date();
    if (status === 'CONFIRMED') updateData.confirmedAt = new Date();
    if (status === 'CANCELLED') updateData.cancelledAt = new Date();
    if (status === 'RECEIVED') {
      updateData.receivedAt = new Date();
      // Update stock and record price history
      const po = await this.prisma.purchaseOrder.findFirst({
        where: { id },
        include: { lines: true },
      });
      if (po) {
        for (const line of po.lines) {
          if (line.productId) {
            await this.prisma.product.update({
              where: { id: line.productId },
              data: { currentStock: { increment: Number(line.qty) } },
            });
            await this.prisma.purchasePriceHistory.create({
              data: {
                companyId: po.companyId,
                productId: line.productId,
                vendorId: po.vendorId,
                purchaseOrderId: po.id,
                unitPrice: line.unitPrice,
                qty: line.qty,
              },
            });
          }
        }
      }
    }
    const data = await this.prisma.purchaseOrder.update({ where: { id }, data: updateData });
    return { data };
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.prisma.purchaseOrder.update({ where: { id }, data: { deletedAt: new Date() } });
    return { data: { success: true } };
  }

  @Get('product/:productId/price-history')
  async priceHistory(@CurrentUser() user: any, @Param('productId') productId: string) {
    const data = await this.prisma.purchasePriceHistory.findMany({
      where: { productId, companyId: user.activeCompanyId },
      include: { vendor: { select: { id: true, name: true } }, purchaseOrder: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
      take: 5,
    });
    return { data };
  }
}
