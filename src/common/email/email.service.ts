import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    if (apiKey) sgMail.setApiKey(apiKey);
  }

  async sendAmcReminderToCustomer(params: {
    toEmail: string;
    toName: string;
    contractNumber: string;
    customerName: string;
    expiryDate: Date;
    daysLeft: number;
    annualValue: number;
    companyName: string;
    companyEmail: string;
    companyPhone: string;
  }) {
    const { toEmail, contractNumber, customerName, expiryDate, daysLeft, annualValue, companyName, companyEmail, companyPhone } = params;

    const expiryStr = expiryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const subject = daysLeft === 0
      ? `⚠️ AMC Contract ${contractNumber} has expired today`
      : `🔔 AMC Contract ${contractNumber} expiring in ${daysLeft} days`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1e3a5f; padding: 24px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">${companyName}</h1>
          <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 13px;">AMC Contract Renewal Reminder</p>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="color: #374151; font-size: 15px;">Dear <strong>${customerName}</strong>,</p>
          ${daysLeft === 0
            ? `<p style="color: #dc2626; font-size: 15px; font-weight: bold;">Your Annual Maintenance Contract has expired today.</p>`
            : `<p style="color: #374151; font-size: 15px;">This is a reminder that your Annual Maintenance Contract is expiring in <strong style="color: ${daysLeft <= 7 ? '#dc2626' : daysLeft <= 30 ? '#d97706' : '#1e3a5f'}">${daysLeft} days</strong>.</p>`
          }
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e5e7eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Contract Number</td>
                <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #111827; text-align: right;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Expiry Date</td>
                <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #dc2626; text-align: right;">${expiryStr}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Annual Value</td>
                <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #111827; text-align: right;">₹${Number(annualValue).toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </div>
          <p style="color: #374151; font-size: 14px;">To renew your contract or for any queries, please contact us:</p>
          <div style="background: #eff6ff; border-radius: 8px; padding: 12px; margin: 12px 0;">
            <p style="margin: 0; font-size: 13px; color: #1e3a5f;">📞 ${companyPhone}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #1e3a5f;">✉️ ${companyEmail}</p>
          </div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">This is an automated reminder from ${companyName}. Please do not reply to this email.</p>
        </div>
      </div>
    `;

    await this.send({ to: toEmail, subject, html, fromName: companyName, fromEmail: companyEmail });
  }

  async sendAmcReminderToTeam(params: {
    toEmails: string[];
    contractNumber: string;
    customerName: string;
    expiryDate: Date;
    daysLeft: number;
    annualValue: number;
    companyName: string;
    companyEmail: string;
  }) {
    const { toEmails, contractNumber, customerName, expiryDate, daysLeft, annualValue, companyName, companyEmail } = params;

    const expiryStr = expiryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const subject = daysLeft === 0
      ? `⚠️ [EXPIRED] AMC ${contractNumber} - ${customerName}`
      : `🔔 [ACTION REQUIRED] AMC ${contractNumber} expiring in ${daysLeft} days - ${customerName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${daysLeft === 0 ? '#dc2626' : daysLeft <= 7 ? '#d97706' : '#1e3a5f'}; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 18px;">AMC Renewal Alert</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0 0; font-size: 13px;">${companyName} — Internal Notification</p>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="background: #f9fafb; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Customer</td>
                <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #111827; text-align: right;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Contract Number</td>
                <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #111827; text-align: right;">${contractNumber}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Expiry Date</td>
                <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #dc2626; text-align: right;">${expiryStr}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Days Left</td>
                <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: ${daysLeft === 0 ? '#dc2626' : daysLeft <= 7 ? '#d97706' : '#111827'}; text-align: right;">${daysLeft === 0 ? 'EXPIRED' : `${daysLeft} days`}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-size: 13px; color: #6b7280;">Annual Value</td>
                <td style="padding: 6px 0; font-size: 13px; font-weight: 600; color: #111827; text-align: right;">₹${Number(annualValue).toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </div>
          <p style="color: #374151; font-size: 13px; margin-top: 16px;">Please follow up with the customer for renewal.</p>
        </div>
      </div>
    `;

    for (const toEmail of toEmails) {
      await this.send({ to: toEmail, subject, html, fromName: companyName, fromEmail: companyEmail });
    }
  }

  private async send(params: { to: string; subject: string; html: string; fromName: string; fromEmail: string }) {
    const fromEmail = this.config.get<string>('SENDGRID_FROM_EMAIL') || params.fromEmail;
    try {
      await sgMail.send({
        to: params.to,
        from: { name: params.fromName, email: fromEmail },
        subject: params.subject,
        html: params.html,
      });
      this.logger.log(`Email sent to ${params.to}: ${params.subject}`);
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${params.to}: ${err.message}`);
    }
  }
}