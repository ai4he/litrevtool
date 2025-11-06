import nodemailer from 'nodemailer';
import { config } from '../core/config';
import logger from '../core/logger';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    if (config.SMTP_HOST) {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth:
          config.SMTP_USER && config.SMTP_PASSWORD
            ? {
                user: config.SMTP_USER,
                pass: config.SMTP_PASSWORD,
              }
            : undefined,
      });
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string
  ): Promise<void> {
    if (!this.transporter) {
      logger.warn('SMTP not configured, skipping email');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: config.SMTP_FROM_EMAIL,
        to,
        subject,
        html: htmlContent,
        text: textContent,
      });

      logger.info(`Email sent to ${to}`);
    } catch (error) {
      logger.error(`Error sending email to ${to}:`, error);
      throw error;
    }
  }

  async sendJobCompletionEmail(
    toEmail: string,
    userName: string,
    jobName: string,
    totalPapers: number,
    downloadUrl: string
  ): Promise<void> {
    const subject = `Your search '${jobName}' is complete`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .content {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
        }
        .button {
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
        }
        .stats {
            background-color: #fff;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #4CAF50;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Search Complete!</h1>
        </div>
        <div class="content">
            <p>Hello ${userName},</p>

            <p>Great news! Your literature search "<strong>${jobName}</strong>" has completed successfully.</p>

            <div class="stats">
                <h3>Results Summary</h3>
                <p><strong>Papers Found:</strong> ${totalPapers}</p>
            </div>

            <p>Your results are ready to download:</p>

            <a href="${downloadUrl}" class="button">Download CSV Results</a>

            <p>This file contains all the paper titles, abstracts, authors, and other metadata extracted from Google Scholar.</p>

            <p>Thank you for using LitRevTool!</p>

            <p style="color: #666; font-size: 0.9em; margin-top: 30px;">
                If you have any questions or feedback, please don't hesitate to reach out.
            </p>
        </div>
    </div>
</body>
</html>
    `;

    const textContent = `
Hello ${userName},

Great news! Your literature search "${jobName}" has completed successfully.

Papers Found: ${totalPapers}

Download your results here:
${downloadUrl}

This file contains all the paper titles, abstracts, authors, and other metadata extracted from Google Scholar.

Thank you for using LitRevTool!
    `;

    await this.sendEmail(toEmail, subject, htmlContent, textContent);
  }
}

export default new EmailService();
