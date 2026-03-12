import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailOptions } from './interface/email.options';
import { EmailResult } from './interface/email.result';
import { EmailContents } from './email-template/email-content';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend?: Resend;
  private readonly appUrl: string;
  private readonly fromEmail: string;

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
      'RESEND_FROM',
      this.configService.get<string>(
        'SMTP_FROM',
        'skill link<noreply@skill-link.com>',
      ),
    );

    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!resendApiKey) {
      this.logger.error(
        'Email client not initialized: missing RESEND_API_KEY',
      );
      return;
    }

    this.resend = new Resend(resendApiKey);
    this.logger.log('Email client initialized (Resend)');
  }
  //
  async sendMail(options: EmailOptions): Promise<EmailResult> {
    try {
      if (!this.resend) {
        const message =
          'Email client is not initialized. Check RESEND_API_KEY env var.';
        this.logger.error(message);
        return { success: false, error: message };
      }

      const from = options.from ?? this.fromEmail;
      const { data, error } = await this.resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (error) {
        throw new Error(error.message);
      }

      this.logger.log(`Email sent successfully to ${options.to}`);

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${options.to}:`,
        error.message,
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  //   SENDING OF EMAIL BEGAN

  async sendVerificationEmail(
    from: 'skill link',
    to: string,
    token: string,
    name: string,
  ): Promise<EmailResult> {
    const verificationLink = `${this.appUrl}/verify-email?token=${token}`;

    return await this.sendMail({
      from,
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
      from: 'Skill link',
      to,
      subject: 'Password Reset Request',
      html: EmailContents.passwordReset(resetLink),
    });
  }
}
