import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { SequenceService } from '../../core/sequences/sequence.service';
import { MarginEngine } from './margin.engine';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Decimal from 'decimal.js';

@Injectable()
export class QuotationsService {
  constructor(
    private prisma: PrismaService,
    private sequences: SequenceService,
    private marginEngine: MarginEngine,
    private events: EventEmitter2,
  ) {}

  async findAll(companyId: string, query: any) {
    const { search, state, contactId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { companyId, parentId: null };
    if (state) where.state = state;
    if (contactId) where.contactId = contactId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contact: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          salesperson: { select: { id: true, fullName: true } },
          _count: { select: { lines: true } },
        },
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return {
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(companyId: string, id: string, includeMargin = false) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, companyId },
      include: {
        contact: true,
        salesperson: { select: { id: true, fullName: true } },
        lead: { select: { id: true, title: true } },
        lines: { orderBy: { sequence: 'asc' } },
        salesOrders: { select: { id: true, name: true, state: true } },
        _count: { select: { lines: true } },
      },
    });

    if (!quotation) throw new NotFoundException('Quotation not found');

    const result = { ...quotation } as any;
    if (!includeMargin) {
      result.totalCost = 0;
      result.marginAmount = 0;
      result.marginPct = 0;
      result.lines = result.lines.map((l: any) => ({ ...l, costPrice: 0 }));
    }

    return { data: result };
  }

  async create(companyId: string, userId: string, dto: any) {
    const name = await this.sequences.next(companyId, 'QUOTATION');

    const validityDays = dto.validityDays || 30;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    const calculatedLines = (dto.lines || []).map((line: any) =>
      this.marginEngine.calculateLine(line),
    );
    const totals = this.marginEngine.calculateTotals(calculatedLines);

    const quotation = await this.prisma.quotation.create({
      data: {
        companyId,
        name,
        version: 1,
        contactId: dto.contactId,
        leadId: dto.leadId,
        salespersonId: dto.salespersonId || userId,
        state: 'DRAFT',
        validityDays,
        validUntil,
        paymentTerms: dto.paymentTerms,
        deliveryTerms: dto.deliveryTerms,
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        quotationType: dto.quotationType || 'SALES',
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        totalCost: totals.totalCost,
        marginAmount: totals.marginAmount,
        marginPct: totals.marginPct,
        lines: {
          create: (dto.lines || []).map((line: any, idx: number) => ({
            productId: line.productId,
            description: line.description,
            sequence: line.sequence || (idx + 1) * 10,
            qty: line.qty,
            uom: line.uom || 'NOS',
            unitPrice: line.unitPrice,
            costPrice: line.costPrice,
            discountPct: line.discountPct || 0,
            taxPct: line.taxPct || 18,
            subtotal: calculatedLines[idx].subtotal,
            taxAmount: calculatedLines[idx].taxAmount,
            lineTotal: calculatedLines[idx].lineTotal,
            marginAmount: calculatedLines[idx].marginAmount,
            marginPct: calculatedLines[idx].marginPct,
            isSection: line.isSection || false,
            notes: line.notes,
          })),
        },
      },
      include: {
        lines: { orderBy: { sequence: 'asc' } },
        contact: { select: { id: true, firstName: true, lastName: true, companyName: true } },
      },
    });

    this.events.emit('quotation.created', { quotation, userId, companyId });
    return { data: quotation };
  }

  async update(companyId: string, id: string, dto: any) {
    const quotation = await this.prisma.quotation.findFirst({ where: { id, companyId } });
    if (!quotation) throw new NotFoundException('Quotation not found');

    const calculatedLines = (dto.lines || []).map((line: any) =>
      this.marginEngine.calculateLine(line),
    );
    const totals = this.marginEngine.calculateTotals(calculatedLines);

    const updated = await this.prisma.quotation.update({
      where: { id },
      data: {
        contactId: dto.contactId,
        salespersonId: dto.salespersonId,
        paymentTerms: dto.paymentTerms,
        deliveryTerms: dto.deliveryTerms,
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        quotationType: dto.quotationType,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        totalCost: totals.totalCost,
        marginAmount: totals.marginAmount,
        marginPct: totals.marginPct,
        lines: dto.lines ? {
          deleteMany: {},
          create: dto.lines.map((line: any, idx: number) => ({
            productId: line.productId,
            description: line.description,
            sequence: line.sequence || (idx + 1) * 10,
            qty: line.qty,
            uom: line.uom || 'NOS',
            unitPrice: line.unitPrice,
            costPrice: line.costPrice,
            discountPct: line.discountPct || 0,
            taxPct: line.taxPct || 18,
            subtotal: calculatedLines[idx]?.subtotal || 0,
            taxAmount: calculatedLines[idx]?.taxAmount || 0,
            lineTotal: calculatedLines[idx]?.lineTotal || 0,
            marginAmount: calculatedLines[idx]?.marginAmount || 0,
            marginPct: calculatedLines[idx]?.marginPct || 0,
            isSection: line.isSection || false,
            notes: line.notes,
          })),
        } : undefined,
      },
      include: {
        lines: { orderBy: { sequence: 'asc' } },
        contact: { select: { id: true, firstName: true, lastName: true, companyName: true } },
      },
    });

    return { data: updated };
  }

  async send(companyId: string, id: string, userId: string) {
    await this.assertDraftState(companyId, id);
    const quotation = await this.prisma.quotation.update({
      where: { id },
      data: { state: 'SENT', sentAt: new Date() },
    });
    this.events.emit('quotation.sent', { quotation, userId, companyId });
    return { data: quotation };
  }

  async confirm(companyId: string, id: string, userId: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, companyId },
      include: { lines: true },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (!['DRAFT', 'SENT'].includes(quotation.state)) {
      throw new BadRequestException(`Cannot confirm a quotation in state: ${quotation.state}`);
    }
    if (quotation.lines.length === 0) {
      throw new BadRequestException('Cannot confirm a quotation with no lines');
    }

    const soName = await this.sequences.next(companyId, 'SALES_ORDER');

    const [updatedQuotation, salesOrder] = await this.prisma.$transaction([
      this.prisma.quotation.update({
        where: { id },
        data: { state: 'CONFIRMED', confirmedAt: new Date() },
      }),
      this.prisma.salesOrder.create({
        data: {
          companyId,
          name: soName,
          quotationId: id,
          contactId: quotation.contactId,
          salespersonId: quotation.salespersonId,
          state: 'CONFIRMED',
          confirmedAt: new Date(),
          paymentTerms: quotation.paymentTerms,
          notes: quotation.notes,
          subtotal: quotation.subtotal,
          taxAmount: quotation.taxAmount,
          totalAmount: quotation.totalAmount,
          totalCost: quotation.totalCost,
          marginAmount: quotation.marginAmount,
          marginPct: quotation.marginPct,
          lines: {
            create: quotation.lines.map((l) => ({
              productId: l.productId,
              quotationLineId: l.id,
              description: l.description,
              sequence: l.sequence,
              qty: l.qty,
              uom: l.uom,
              unitPrice: l.unitPrice,
              costPrice: l.costPrice,
              taxPct: l.taxPct,
              subtotal: l.subtotal,
              taxAmount: l.taxAmount,
              lineTotal: l.lineTotal,
            })),
          },
        },
      }),
    ]);

    this.events.emit('quotation.confirmed', {
      quotation: updatedQuotation,
      salesOrder,
      userId,
      companyId,
    });

    return { data: { quotation: updatedQuotation, salesOrder } };
  }

  async cancel(companyId: string, id: string) {
    const quotation = await this.prisma.quotation.findFirst({ where: { id, companyId } });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (quotation.state === 'CONFIRMED') {
      throw new BadRequestException('Cannot cancel a confirmed quotation');
    }
    const updated = await this.prisma.quotation.update({
      where: { id },
      data: { state: 'CANCELLED', cancelledAt: new Date() },
    });
    return { data: updated };
  }

  async getProfitability(companyId: string, id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, companyId },
      include: { lines: { orderBy: { sequence: 'asc' } } },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');

    return {
      data: {
        quotationId: id,
        name: quotation.name,
        subtotal: quotation.subtotal,
        totalCost: quotation.totalCost,
        marginAmount: quotation.marginAmount,
        marginPct: quotation.marginPct,
        isBelowThreshold: this.marginEngine.isMarginBelowThreshold(
          new Decimal(quotation.marginPct as any),
        ),
      },
    };
  }

  private async assertDraftState(companyId: string, id: string) {
    const quotation = await this.prisma.quotation.findFirst({ where: { id, companyId } });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (quotation.state !== 'DRAFT') {
      throw new BadRequestException(`Only DRAFT quotations can be edited`);
    }
    return quotation;
  }
}