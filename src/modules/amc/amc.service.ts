import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AmcService {
  constructor(private prisma: PrismaService) {}

  async list(query: any) {
    const { search, status, companyId } = query;
    const where: any = { deletedAt: null };

    if (companyId) where.companyId = companyId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { contractNumber: { contains: search, mode: 'insensitive' } },
        { contact: { companyName: { contains: search, mode: 'insensitive' } } },
        { contact: { firstName: { contains: search, mode: 'insensitive' } } },
        { sites: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Auto update status based on dates
    const today = new Date();
    const contracts = await this.prisma.amcContract.findMany({
      where,
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, companyName: true },
        },
      },
      orderBy: { endDate: 'asc' },
    });

    // Calculate dynamic status
    return {
      data: contracts.map((c) => ({
        ...c,
        status: this.computeStatus(c),
      })),
      meta: { total: contracts.length },
    };
  }

  async summary() {
    const contracts = await this.prisma.amcContract.findMany({
      where: { deletedAt: null },
    });

    const today = new Date();
    let active = 0, pendingRenewal = 0, renewed = 0, cancelled = 0;
    let totalMonthly = 0;

    contracts.forEach((c) => {
      const status = this.computeStatus(c);
      if (status === 'ACTIVE') active++;
      else if (status === 'PENDING_RENEWAL') pendingRenewal++;
      else if (status === 'RENEWED') renewed++;
      else if (status === 'CANCELLED') cancelled++;
      if (status === 'ACTIVE' || status === 'PENDING_RENEWAL') {
        totalMonthly += Number(c.monthlyValue);
      }
    });

    return {
      data: { active, pendingRenewal, renewed, cancelled, totalMonthly },
    };
  }

  async get(id: string) {
    const contract = await this.prisma.amcContract.findUnique({
      where: { id },
      include: {
        contact: true,
      },
    });
    return { data: { ...contract, status: this.computeStatus(contract) } };
  }

  async create(body: any) {
    const { contactId, contractNumber, startDate, endDate, monthlyValue,
      annualValue, sites, servicesCctv, servicesSecurity, servicesFire,
      renewalReminderDays, notes, companyId } = body;

    const contract = await this.prisma.amcContract.create({
      data: {
        companyId,
        contractNumber,
        contactId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        monthlyValue: monthlyValue || 0,
        annualValue: annualValue || 0,
        sites,
        servicesCctv: servicesCctv || false,
        servicesSecurity: servicesSecurity || false,
        servicesFire: servicesFire || false,
        renewalReminderDays: renewalReminderDays || 30,
        notes,
        status: 'ACTIVE',
      },
    });

    return { data: contract };
  }

  async update(id: string, body: any) {
    const contract = await this.prisma.amcContract.update({
      where: { id },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });
    return { data: contract };
  }

  async renew(id: string, body: any) {
    const { newEndDate, monthlyValue, annualValue } = body;
    const contract = await this.prisma.amcContract.update({
      where: { id },
      data: {
        endDate: new Date(newEndDate),
        monthlyValue: monthlyValue,
        annualValue: annualValue,
        status: 'RENEWED',
      },
    });
    return { data: contract };
  }

  async cancel(id: string) {
    const contract = await this.prisma.amcContract.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    return { data: contract };
  }

  private computeStatus(contract: any): string {
    if (!contract) return 'ACTIVE';
    if (contract.status === 'CANCELLED') return 'CANCELLED';
    if (contract.status === 'RENEWED') return 'RENEWED';

    const today = new Date();
    const endDate = new Date(contract.endDate);
    const reminderDate = new Date(endDate);
    reminderDate.setDate(reminderDate.getDate() - (contract.renewalReminderDays || 30));

    if (today >= reminderDate && today <= endDate) return 'PENDING_RENEWAL';
    if (today > endDate) return 'PENDING_RENEWAL';
    return 'ACTIVE';
  }
}