import { Logger } from "@nestjs/common";
import { EmailService } from "src/shared/email/email.service";

export const sendVerificationEmailAsync = async (
  emailsService: EmailService,
  logger: Logger,
  email: string,
  token: string,
  name: string,
): Promise<void> => {
  try {
    const result = await emailsService.sendVerificationEmail(
      'skill link',
      email,
      token,
      name,
    );

    if (result.success) {
      logger.log(`Verification email sent to ${email}`);
    } else {
      logger.error(
        `Failed to send verification email to ${email}: ${result.error}`,
      );
    }
  } catch (error) {
    logger.error(
      `Error sending verification email to ${email}:`,
      error.message,
    );
    // Don't throw - registration should succeed even if email fails
  }
};


export const sendWelcomeEmailHelper = async (
  emailsService: EmailService,
  logger: Logger,
  email: string,
  name: string,
): Promise<void> => {
  try {
    const result = await emailsService.sendWelcomeEmail(email, name);

    if (result.success) {
      logger.log(`Welcome email sent to ${email}`);
    } else {
      logger.error(`Failed to send welcome email to ${email}: ${result.error}`);
    }
  } catch (error: any) {
    logger.error(`Error sending welcome email to ${email}:`, error.message);
  }
};


export const sendPasswordResetEmailHelper = async (
  emailsService: EmailService,
  logger: Logger,
  email: string,
  token: string,
): Promise<any> => {
  try {
    const result = await emailsService.sendPasswordResetEmail(email, token);

    if (result.success) {
      logger.log(`Password Reset email sent to ${email}`);
    } else {
      logger.error(`Failed to send reset password email to ${email}: ${result.error}`);
    }
  } catch (error: any) {
    logger.error(`Error sending reset password email to ${email}:`, error.message);
  }
};

