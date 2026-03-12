import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';
import { EmailOptions } from './interface/email.options';
import { EmailResult } from './interface/email.result';
import { EmailContents } from './email-template/email-content';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly appUrl: string;
  private readonly fromEmail: string;
  private initialized = false;

  constructor(private configService: ConfigService) {
    const isProd = process.env.NODE_ENV === 'production';
    const frontendDev = this.configService.get<string>('FRONTEND_URL_DEV');
    const frontendProd = this.configService.get<string>('FRONTEND_URL_PROD');
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ??
      (isProd ? frontendProd : frontendDev);
    this.appUrl =
      frontendUrl ??
      this.configService.get<string>('APP_URL', 'http://localhost:5000');

    this.fromEmail = this.configService.get<string>(
      'SENDGRID_FROM',
      'jenniferlumanas68@gmail.com', // 👈 replace with the Gmail you verified in SendGrid
    );

    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (!apiKey) {
      this.logger.error(
        'Email client not initialized: missing SENDGRID_API_KEY',
      );
      return;
    }

    sgMail.setApiKey(apiKey);
    this.initialized = true;
    this.logger.log('Email client initialized (SendGrid)');
  }

  async sendMail(options: EmailOptions): Promise<EmailResult> {
    try {
      if (!this.initialized) {
        const message =
          'Email client is not initialized. Check SENDGRID_API_KEY env var.';
        this.logger.error(message);
        return { success: false, error: message };
      }

      const from = options.from ?? this.fromEmail;

      await sgMail.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      this.logger.log(`Email sent successfully to ${options.to}`);
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}:`,
        error.message,
      );
      return { success: false, error: error.message };
    }
  }

  async sendVerificationEmail(
    to: string,
    token: string,
    name: string,
  ): Promise<EmailResult> {
    const verificationLink = `${this.appUrl}/verify-email?token=${token}`;
    return await this.sendMail({
      to,
      subject: 'Verify Your Email Address',
      html: EmailContents.emailVerification(verificationLink, name),
    });
  }

  async sendWelcomeEmail(to: string, name: string): Promise<EmailResult> {
    return await this.sendMail({
      to,
      subject: 'Welcome to Skill Link!',
      html: EmailContents.welcome(name),
    });
  }

  async sendPasswordResetEmail(
    to: string,
    token: string,
  ): Promise<EmailResult> {
    const resetLink = `${this.appUrl}/reset-password?token=${token}`;
    return await this.sendMail({
      to,
      subject: 'Password Reset Request',
      html: EmailContents.passwordReset(resetLink),
    });
  }
}
