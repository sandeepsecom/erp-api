import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, query: any) {
    const { assignedTo, status, refModel, refId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (assignedTo) where.assignedTo = assignedTo;
    if (status) where.status = status;
    if (refModel) where.refModel = refModel;
    if (refId) where.refId = refId;

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        orderBy: { dueAt: 'asc' },
        skip,
        take: Number(limit),
        include: {
          assignee: { select: { id: true, fullName: true } },
          lead: { select: { id: true, title: true } },
          contact: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        },
      }),
      this.prisma.activity.count({ where }),
    ]);

    return {
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  async create(companyId: string, userId: string, dto: any) {
    const activity = await this.prisma.activity.create({
      data: { companyId, createdBy: userId, status: 'PLANNED', ...dto },
    });
    return { data: activity };
  }

  async markDone(companyId: string, id: string) {
    const activity = await this.prisma.activity.findFirst({ where: { id, companyId } });
    if (!activity) throw new NotFoundException('Activity not found');

    const updated = await this.prisma.activity.update({
      where: { id },
      data: { status: 'DONE', doneAt: new Date() },
    });

    if (updated.leadId) {
      await this.prisma.lead.update({
        where: { id: updated.leadId },
        data: { lastActivityAt: new Date() },
      });
    }

    return { data: updated };
  }

  async getTodayActivities(companyId: string, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const data = await this.prisma.activity.findMany({
      where: {
        companyId,
        assignedTo: userId,
        status: 'PLANNED',
        dueAt: { gte: today, lt: tomorrow },
      },
      include: {
        lead: { select: { id: true, title: true } },
        contact: { select: { id: true, firstName: true, lastName: true, companyName: true } },
      },
      orderBy: { dueAt: 'asc' },
    });

    return { data };
  }
}