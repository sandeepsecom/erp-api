import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class ChatterService {
  constructor(private prisma: PrismaService) {}

  async getMessages(companyId: string, refModel: string, refId: string) {
    const messages = await this.prisma.chatterMessage.findMany({
      where: { companyId, refModel, refId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
    return { data: messages };
  }

  async postMessage(
    companyId: string,
    userId: string,
    refModel: string,
    refId: string,
    dto: any,
  ) {
    const message = await this.prisma.chatterMessage.create({
      data: {
        companyId,
        userId,
        refModel,
        refId,
        body: dto.body,
        subject: dto.subject,
        type: dto.type || 'NOTE',
        isInternal: dto.isInternal ?? true,
        attachments: dto.attachments || [],
      },
      include: {
        user: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });
    return { data: message };
  }
}