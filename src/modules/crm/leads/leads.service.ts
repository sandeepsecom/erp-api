import {
  Injectable, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

const STAGE_ORDER = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  async findAll(companyId: string, query: any) {
    const { search, stage, assignedTo, view, page = 1, limit = 20 } = query;

    const where: any = { companyId };
    if (stage) where.stage = stage;
    if (assignedTo) where.assignedTo = assignedTo;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (view === 'kanban') {
      return this.getKanbanView(companyId, where);
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        skip,
        take: Number(limit),
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, companyName: true, phone: true },
          },
          assignee: { select: { id: true, fullName: true } },
          _count: { select: { activities: true, quotations: true } },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data,
      meta: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) },
    };
  }

  private async getKanbanView(companyId: string, baseWhere: any) {
    const stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

    const columns = await Promise.all(
      stages.map(async (stage) => {
        const where = { ...baseWhere, stage };
        const leads = await this.prisma.lead.findMany({
          where,
          orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
          take: 20,
          include: {
            contact: {
              select: { id: true, firstName: true, lastName: true, companyName: true },
            },
            assignee: { select: { id: true, fullName: true } },
          },
        });
        const total = await this.prisma.lead.count({ where });
        const aggregate = await this.prisma.lead.aggregate({
          where,
          _sum: { expectedValue: true },
        });

        return {
          stage,
          total,
          totalValue: aggregate._sum.expectedValue || 0,
          leads,
        };
      }),
    );

    return { data: columns };
  }

  async findOne(companyId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, companyId },
      include: {
        contact: true,
        assignee: { select: { id: true, fullName: true } },
        quotations: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, name: true, state: true, totalAmount: true, createdAt: true },
        },
        activities: {
          where: { status: 'PLANNED' },
          include: { assignee: { select: { id: true, fullName: true } } },
        },
        _count: { select: { activities: true, quotations: true } },
      },
    });

    if (!lead) throw new NotFoundException('Lead not found');
    return { data: lead };
  }

  async create(companyId: string, userId: string, dto: any) {
    const lead = await this.prisma.lead.create({
      data: { companyId, ...dto },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, companyName: true } },
      },
    });

    this.events.emit('lead.created', { lead, userId, companyId });
    return { data: lead };
  }

  async update(companyId: string, id: string, dto: any) {
    await this.assertExists(companyId, id);
    const lead = await this.prisma.lead.update({
      where: { id },
      data: dto,
    });
    return { data: lead };
  }

  async moveStage(companyId: string, id: string, userId: string, dto: any) {
    const lead = await this.assertExists(companyId, id);

    const updateData: any = {
      stage: dto.stage,
      lastActivityAt: new Date(),
    };

    if (dto.stage === 'WON') {
      updateData.wonAt = new Date();
      updateData.probability = 100;
    }

    if (dto.stage === 'LOST') {
      updateData.lostAt = new Date();
      updateData.probability = 0;
      updateData.lostReason = dto.lostReason;
      updateData.lostNote = dto.lostNote;
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: updateData,
    });

    this.events.emit('lead.stage_changed', {
      lead: updated,
      fromStage: lead.stage,
      toStage: dto.stage,
      userId,
      companyId,
    });

    return { data: updated };
  }

  async getPipelineSummary(companyId: string) {
    const stageGroups = await this.prisma.lead.groupBy({
      by: ['stage'],
      where: { companyId },
      _count: { id: true },
      _sum: { expectedValue: true },
    });

    const totalValue = await this.prisma.lead.aggregate({
      where: { companyId, stage: { notIn: ['WON', 'LOST'] } },
      _sum: { expectedValue: true },
    });

    const summary = STAGE_ORDER.map((stage) => {
      const group = stageGroups.find((g) => g.stage === stage);
      return {
        stage,
        count: group?._count?.id || 0,
        value: group?._sum?.expectedValue || 0,
      };
    });

    return {
      data: {
        stages: summary,
        pipelineValue: totalValue._sum.expectedValue || 0,
        totalLeads: summary.reduce((sum, s) => sum + s.count, 0),
      },
    };
  }

  async assertExists(companyId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, companyId } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }
}