import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async findAll(companyId: string, query: any) {
    const { search, state, contactId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (state) where.state = state;
    if (contactId) where.contactId = contactId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contact: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where,
        orderBy: { confirmedAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, companyName: true } },
          salesperson: { select: { id: true, fullName: true } },
          quotation: { select: { id: true, name: true, version: true } },
          _count: { select: { lines: true } },
        },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);

    return {
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(companyId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, companyId },
      include: {
        contact: true,
        salesperson: { select: { id: true, fullName: true } },
        quotation: { select: { id: true, name: true, version: true } },
        lines: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!order) throw new NotFoundException('Sales order not found');
    return { data: order };
  }

  async done(companyId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({ where: { id, companyId } });
    if (!order) throw new NotFoundException('Sales order not found');
    if (!['CONFIRMED', 'IN_PROGRESS'].includes(order.state)) {
      throw new BadRequestException(`Cannot mark ${order.state} order as done`);
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { state: 'DONE' },
    });

    this.events.emit('order.done', { order: updated, companyId });
    return { data: updated };
  }

  async cancel(companyId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({ where: { id, companyId } });
    if (!order) throw new NotFoundException('Sales order not found');
    if (order.state === 'DONE') {
      throw new BadRequestException('Cannot cancel a completed order');
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { state: 'CANCELLED' },
    });
    return { data: updated };
  }
}