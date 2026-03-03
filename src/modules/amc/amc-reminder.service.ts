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

    // Get all active contracts with their company and contact info
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

      // Check if daysLeft matches any reminder threshold
      if (!REMINDER_DAYS.includes(daysLeft)) continue;

      // Check if reminder already sent for this threshold
      const alreadySent = contract.reminderLogs.some(
        (log) => log.daysBeforeExpiry === daysLeft,
      );
      if (alreadySent) continue;

      this.logger.log(`Sending ${daysLeft}-day reminder for contract ${contract.contractNumber}`);

      const customerName = contract.contact?.companyName ||
        `${contract.contact?.firstName} ${contract.contact?.lastName || ''}`.trim();
      const customerEmail = contract.contact?.email;
      const companyEmail = contract.company?.email || '';
      const companyPhone = contract.company?.phone || '';
      const companyName = contract.company?.name || '';

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
        });
        sentEmails.push(customerEmail);
      }

      // Send to internal team (company email)
      const teamEmails: string[] = [];
      if (companyEmail) teamEmails.push(companyEmail);

      if (teamEmails.length > 0) {
        await this.emailService.sendAmcReminderToTeam({
          toEmails: teamEmails,
          contractNumber: contract.contractNumber,
          customerName,
          expiryDate: expiry,
          daysLeft,
          annualValue: Number(contract.annualValue),
          companyName,
          companyEmail,
        });
        sentEmails.push(...teamEmails);
      }

      // Log that reminder was sent
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