import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, query: any) {
    const { search, type, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          _count: {
            select: { leads: true, quotations: true, salesOrders: true },
          },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(companyId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, companyId },
      include: {
        leads: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, title: true, stage: true, expectedValue: true, createdAt: true },
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, name: true, state: true, totalAmount: true, createdAt: true },
        },
        _count: {
          select: { leads: true, quotations: true, salesOrders: true },
        },
      },
    });

    if (!contact) throw new NotFoundException('Contact not found');
    return { data: contact };
  }

  async create(companyId: string, dto: any) {
    const contact = await this.prisma.contact.create({
      data: { companyId, ...dto },
    });
    return { data: contact };
  }

  async update(companyId: string, id: string, dto: any) {
    await this.assertExists(companyId, id);
    const contact = await this.prisma.contact.update({
      where: { id },
      data: dto,
    });
    return { data: contact };
  }

  async remove(companyId: string, id: string) {
    await this.assertExists(companyId, id);
    await this.prisma.contact.delete({ where: { id } });
    return { data: { message: 'Contact deleted' } };
  }

  async assertExists(companyId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({ where: { id, companyId } });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }
}