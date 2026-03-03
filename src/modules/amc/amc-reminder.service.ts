import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';

const REMINDER_DAYS = [60, 30, 15, 7, 0];

@Injectable()
export class AmcReminderService {
  private readonly logger = new Logger(AmcReminderService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendReminders() {
    this.logger.log('Running AMC reminder job...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const contracts = await this.prisma.amcContract.findMany({
      where: { status: 'ACTIVE' },
      include: {
        contact: true,
        company: true,
        reminderLogs: true,
      },
    });

    this.logger.log(`Found ${contracts.length} active contracts`);

    for (const contract of contracts) {
      const expiry = new Date(contract.endDate);
      expiry.setHours(0, 0, 0, 0);

      const diffMs = expiry.getTime() - today.getTime();
      const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (!REMINDER_DAYS.includes(daysLeft)) continue;

      const alreadySent = contract.reminderLogs.some(
        (log) => log.daysBeforeExpiry === daysLeft,
      );
      if (alreadySent) continue;

      // Skip if company has no sendgrid config
      if (!contract.company?.sendgridApiKey || !contract.company?.emailFromAddress) {
        this.logger.warn(`No email config for company ${contract.company?.name}, skipping contract ${contract.contractNumber}`);
        continue;
      }

      this.logger.log(`Sending ${daysLeft}-day reminder for contract ${contract.contractNumber}`);

      const customerName = contract.contact?.companyName ||
        `${contract.contact?.firstName} ${contract.contact?.lastName || ''}`.trim();
      const customerEmail = contract.contact?.email;
      const companyEmail = contract.company.emailFromAddress;
      const companyPhone = contract.company?.phone || '';
      const companyName = contract.company?.emailFromName || contract.company?.name || '';
      const sendgridApiKey = contract.company.sendgridApiKey;
      const internalEmails = contract.company?.internalEmailCC || [];

      const sentEmails: string[] = [];

      // Send to customer
      if (customerEmail) {
        await this.emailService.sendAmcReminderToCustomer({
          toEmail: customerEmail,
          toName: customerName,
          contractNumber: contract.contractNumber,
          customerName,
          expiryDate: expiry,
          daysLeft,
          annualValue: Number(contract.annualValue),
          companyName,
          companyEmail,
          companyPhone,
          sendgridApiKey,
        });
        sentEmails.push(customerEmail);
      }

      // Send to internal team
      if (internalEmails.length > 0) {
        await this.emailService.sendAmcReminderToTeam({
          toEmails: internalEmails,
          contractNumber: contract.contractNumber,
          customerName,
          expiryDate: expiry,
          daysLeft,
          annualValue: Number(contract.annualValue),
          companyName,
          companyEmail,
          sendgridApiKey,
        });
        sentEmails.push(...internalEmails);
      }

      // Log reminder sent
      await this.prisma.amcReminderLog.create({
        data: {
          contractId: contract.id,
          daysBeforeExpiry: daysLeft,
          sentToEmails: sentEmails,
        },
      });
    }

    this.logger.log('AMC reminder job completed');
  }
}