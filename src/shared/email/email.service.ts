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
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    this.fromEmail = this.configService.get<string>(
      'SMTP_FROM',
      'skill link<noreply@skill-link.com>',
    );
    this.appUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:5000',
    );

    if (process.env.NODE_ENV === 'production') {
      this.transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: Number(process.env.MAIL_PORT) === 465,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });

      this.logger.log('Email transporter initialized');
    } else {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'alisha.goldner19@ethereal.email',
          pass: 'uEM1EkZePfyNfBvDXB',
        },
      });
      this.logger.log(
        'Email transporter initialized for development (Ethereal)',
      );
    }
  }

  async sendMail(options: EmailOptions): Promise<EmailResult> {
    try {
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
