import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

type DocType = 'QUOTATION' | 'SALES_ORDER' | 'INVOICE' | 'CREDIT_NOTE' | 'PURCHASE_ORDER' | 'SERVICE_TICKET';

const PREFIX_MAP: Record<DocType, string> = {
  QUOTATION: 'QTN',
  SALES_ORDER: 'SO',
  INVOICE: 'INV',
  CREDIT_NOTE: 'CN',
  PURCHASE_ORDER: 'PO',
  SERVICE_TICKET: 'ST',
};

@Injectable()
export class SequenceService {
  constructor(private prisma: PrismaService) {}

  async next(companyId: string, documentType: DocType): Promise<string> {
    const fiscalYear = this.getCurrentFiscalYear();

    const result = await this.prisma.$transaction(async (tx) => {
      const seq = await tx.docSequence.upsert({
        where: {
          companyId_documentType_fiscalYear: {
            companyId,
            documentType,
            fiscalYear,
          },
        },
        update: { lastNumber: { increment: 1 } },
        create: {
          companyId,
          documentType,
          prefix: PREFIX_MAP[documentType],
          lastNumber: 1,
          padding: 4,
          fiscalYear,
        },
      });
      return seq;
    });

    const padded = String(result.lastNumber).padStart(result.padding, '0');
    return `${result.prefix}/${fiscalYear}/${padded}`;
  }

  private getCurrentFiscalYear(): string {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    if (month >= 4) {
      return `${year}-${String(year + 1).slice(2)}`;
    } else {
      return `${year - 1}-${String(year).slice(2)}`;
    }
  }
}