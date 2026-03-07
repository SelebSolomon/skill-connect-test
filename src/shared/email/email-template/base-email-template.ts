// src/modules/emails/templates/base-email.template.ts

export interface EmailTemplateOptions {
  heading: string;
  greeting?: string;
  content: string;
  buttonText?: string;
  buttonLink?: string;
  buttonColor?: string;
  additionalInfo?: string;
  footerNote?: string;
}

export class EmailTemplate {
  static generate(options: EmailTemplateOptions): string {
    const {
      heading,
      greeting = 'Hello,',
      content,
      buttonText,
      buttonLink,
      buttonColor = '#007bff',
      additionalInfo,
      footerNote,
    } = options;

    const currentYear = new Date().getFullYear();

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              padding: 20px;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #007bff;
              margin-bottom: 20px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #007bff;
            }
            h2 {
              color: #333;
              margin-top: 0;
            }
            .greeting {
              font-size: 16px;
              margin-bottom: 10px;
            }
            .content {
              margin: 20px 0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: ${buttonColor};
              color: #ffffff;
              text-decoration: none;
              border-radius: 4px;
              margin: 20px 0;
              font-weight: bold;
            }
            .button:hover {
              opacity: 0.9;
            }
            .link-text {
              word-break: break-all;
              color: #007bff;
              text-decoration: none;
            }
            .additional-info {
              background-color: #f8f9fa;
              padding: 15px;
              border-left: 4px solid #007bff;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
              text-align: center;
            }
            .footer-note {
              font-style: italic;
              margin-bottom: 10px;
            }
            @media only screen and (max-width: 600px) {
              .container {
                margin: 10px;
                padding: 15px;
              }
              .button {
                display: block;
                text-align: center;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Jumai API</div>
            </div>
            
            <h2>${heading}</h2>
            <p class="greeting">${greeting}</p>
            
            <div class="content">
              ${content}
            </div>
            
            ${
              buttonText && buttonLink
                ? `
              <div style="text-align: center;">
                <a href="${buttonLink}" class="button">${buttonText}</a>
              </div>
              <p style="font-size: 14px;">Or copy and paste this link into your browser:</p>
              <p><a href="${buttonLink}" class="link-text">${buttonLink}</a></p>
            `
                : ''
            }
            
            ${
              additionalInfo
                ? `
              <div class="additional-info">
                ${additionalInfo}
              </div>
            `
                : ''
            }
            
            <div class="footer">
              ${footerNote ? `<p class="footer-note">${footerNote}</p>` : ''}
              <p>This is an automated email, please do not reply.</p>
              <p>&copy; ${currentYear} Jumai API. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
