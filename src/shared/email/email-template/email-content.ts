// src/modules/emails/templates/email-contents.ts

import { EmailTemplate } from './base-email-template';

export class EmailContents {
  /**
   * Password Reset Email Content
   */
  static passwordReset(resetLink: string): string {
    return EmailTemplate.generate({
      heading: 'Password Reset Request',
      greeting: `Hello`,
      content: `
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
      `,
      buttonText: 'Reset Password',
      buttonLink: resetLink,
      buttonColor: '#007bff',
      additionalInfo: '<strong>This link will expire in 1 hour.</strong>',
      footerNote:
        "If you didn't request a password reset, please ignore this email or contact support if you have concerns.",
    });
  }

  /**
   * Email Verification Content
   */
  static emailVerification(verificationLink: string, name: string): string {
    return EmailTemplate.generate({
      heading: 'Welcome to Skill Link! 🎉',
      greeting: `Hello ${name},`,
      content: `
        <p>Thank you for signing up! Please verify your email address to activate your account.</p>
      `,
      buttonText: 'Verify Email',
      buttonLink: verificationLink,
      buttonColor: '#28a745',
      additionalInfo: '<strong>This link will expire in 24 hours.</strong>',
      footerNote:
        "If you didn't create this account, please ignore this email.",
    });
  }

  /**
   * Welcome Email Content
   */
  static welcome(name: string): string {
    return EmailTemplate.generate({
      heading: 'Welcome Aboard! 🚀',
      greeting: `Hello ${name},`,
      content: `
        <p>Your email has been verified successfully! You can now enjoy full access to all features.</p>
        <p><strong>Here's what you can do:</strong></p>
        <ul>
          <li>Browse and purchase products</li>
          <li>Manage your profile</li>
          <li>Track your orders</li>
          <li>Save your favorite items</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
      `,
      buttonText: 'Get Started',
      buttonLink: '${appUrl}/dashboard',
      buttonColor: '#6f42c1',
    });
  }

  /**
   * Order Confirmation Content
   */
  static orderConfirmation(orderDetails: {
    orderId: string;
    totalAmount: number;
    items: any[];
  }): string {
    const itemsList = orderDetails.items
      .map(
        (item) => `
      <li>${item.name} - Quantity: ${item.quantity} - $${item.price.toFixed(2)}</li>
    `,
      )
      .join('');

    return EmailTemplate.generate({
      heading: 'Order Confirmation',
      greeting: 'Thank you for your order!',
      content: `
        <p>Your order has been received and is being processed.</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Order ID:</strong> ${orderDetails.orderId}</p>
          <p style="margin: 5px 0;"><strong>Total Amount:</strong> $${orderDetails.totalAmount.toFixed(2)}</p>
        </div>
        <p><strong>Order Items:</strong></p>
        <ul>${itemsList}</ul>
        <p>We'll send you another email when your order ships.</p>
      `,
      buttonText: 'Track Order',
      buttonLink: '${appUrl}/orders/${orderDetails.orderId}',
      buttonColor: '#ff6b6b',
    });
  }

  /**
   * Account Activation Success
   */
  static accountActivated(name: string): string {
    return EmailTemplate.generate({
      heading: 'Account Activated Successfully! ✓',
      greeting: `Hello ${name},`,
      content: `
        <p>Great news! Your account has been successfully activated.</p>
        <p>You now have full access to all features and can start using our platform.</p>
      `,
      buttonText: 'Go to Dashboard',
      buttonLink: '${appUrl}/dashboard',
      buttonColor: '#28a745',
    });
  }

  /**
   * Password Changed Notification
   */
  static passwordChanged(name: string): string {
    return EmailTemplate.generate({
      heading: 'Password Changed Successfully',
      greeting: `Hello ${name},`,
      content: `
        <p>Your password has been changed successfully.</p>
        <p>If you made this change, you can safely ignore this email.</p>
      `,
      additionalInfo:
        "<strong>If you didn't make this change, please contact our support team immediately.</strong>",
      footerNote:
        'For security reasons, we recommend using a strong, unique password.',
    });
  }

  /**
   * Two-Factor Authentication Code
   */
  static twoFactorCode(code: string, name: string): string {
    return EmailTemplate.generate({
      heading: 'Your Verification Code',
      greeting: `Hello ${name},`,
      content: `
        <p>You requested a verification code to access your account.</p>
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 4px; margin: 20px 0;">
          <h1 style="margin: 0; color: #007bff; font-size: 36px; letter-spacing: 5px;">${code}</h1>
        </div>
        <p>Enter this code to complete your login.</p>
      `,
      additionalInfo: '<strong>This code will expire in 10 minutes.</strong>',
      footerNote: "If you didn't request this code, please ignore this email.",
    });
  }

  /**
   * Newsletter Subscription
   */
  static newsletterSubscription(name: string, unsubscribeLink: string): string {
    return EmailTemplate.generate({
      heading: 'Newsletter Subscription Confirmed',
      greeting: `Hello ${name},`,
      content: `
        <p>Thank you for subscribing to our newsletter!</p>
        <p>You'll now receive updates about:</p>
        <ul>
          <li>New product launches</li>
          <li>Special offers and discounts</li>
          <li>Platform updates and features</li>
        </ul>
        <p>We promise not to spam you!</p>
      `,
      footerNote: `<a href="${unsubscribeLink}" style="color: #666;">Unsubscribe</a> from these emails at any time.`,
    });
  }
}
