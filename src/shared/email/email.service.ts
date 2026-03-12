import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailOptions } from './interface/email.options';
import { EmailResult } from './interface/email.result';
import { EmailContents } from './email-template/email-content';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter?: nodemailer.Transporter;
  private readonly appUrl: string;
  private readonly fromEmail: string;

  constructor(private configService: ConfigService) {
    const smtpHost =
      this.configService.get<string>('SMTP_HOST') ??
      this.configService.get<string>('MAIL_HOST');
    const smtpPort =
      this.configService.get<number>('SMTP_PORT') ??
      this.configService.get<number>('MAIL_PORT');
    const smtpUser =
      this.configService.get<string>('SMTP_USER') ??
      this.configService.get<string>('MAIL_USER');
    const smtpPass =
      this.configService.get<string>('SMTP_PASS') ??
      this.configService.get<string>('MAIL_PASS');
    this.fromEmail = this.configService.get<string>(
      'SMTP_FROM',
      'skill link<noreply@skill-link.com>',
    );
    this.appUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:5000',
    );

    if (process.env.NODE_ENV === 'production') {
      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        this.logger.error(
          'Email transporter not initialized: missing SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS',
        );
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      this.logger.log('Email transporter initialized (production)');
      return;
    } else {
      const etherealHost =
        this.configService.get<string>('ETHEREAL_HOST') ?? 'smtp.ethereal.email';
      const etherealPort =
        this.configService.get<number>('ETHEREAL_PORT') ?? 587;
      const etherealUser = this.configService.get<string>('ETHEREAL_USER');
      const etherealPass = this.configService.get<string>('ETHEREAL_PASS');

      if (!etherealUser || !etherealPass) {
        this.logger.error(
          'Email transporter not initialized: missing ETHEREAL_USER/ETHEREAL_PASS',
        );
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: etherealHost,
        port: etherealPort,
        secure: etherealPort === 465,
        auth: {
          user: etherealUser,
          pass: etherealPass,
        },
      });

      this.logger.log('Email transporter initialized (development / Ethereal)');
    }
  }
//
  async sendMail(options: EmailOptions): Promise<EmailResult> {
    try {
      if (!this.transporter) {
        const message =
          'Email transporter is not initialized. Check SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS.';
        this.logger.error(message);
        return { success: false, error: message };
      }

      const mailOptions = {
        from: this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
      };

      const info = await this.transporter.sendMail(mailOptions);

      this.logger.log(`Email sent successfully to ${options.to}`);

      return {
        success: true,
        messageId: info.messageId,
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
