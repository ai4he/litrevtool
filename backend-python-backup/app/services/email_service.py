import logging
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications."""

    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL

    async def send_email_async(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str = None
    ):
        """
        Send an email asynchronously.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML content of email
            text_content: Plain text content (optional)
        """
        if not self.smtp_host:
            logger.warning("SMTP not configured, skipping email")
            return

        try:
            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            message['From'] = self.from_email
            message['To'] = to_email

            # Add text version
            if text_content:
                part1 = MIMEText(text_content, 'plain')
                message.attach(part1)

            # Add HTML version
            part2 = MIMEText(html_content, 'html')
            message.attach(part2)

            # Send email
            await aiosmtplib.send(
                message,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                start_tls=True
            )

            logger.info(f"Email sent to {to_email}")

        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {e}")
            raise

    def send_email_sync(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str = None
    ):
        """
        Send an email synchronously (for use in Celery tasks).

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML content of email
            text_content: Plain text content (optional)
        """
        if not self.smtp_host:
            logger.warning("SMTP not configured, skipping email")
            return

        import smtplib

        try:
            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            message['From'] = self.from_email
            message['To'] = to_email

            # Add text version
            if text_content:
                part1 = MIMEText(text_content, 'plain')
                message.attach(part1)

            # Add HTML version
            part2 = MIMEText(html_content, 'html')
            message.attach(part2)

            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                if self.smtp_user and self.smtp_password:
                    server.login(self.smtp_user, self.smtp_password)
                server.send_message(message)

            logger.info(f"Email sent to {to_email}")

        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {e}")
            raise

    def send_job_completion_email(
        self,
        to_email: str,
        user_name: str,
        job_name: str,
        total_papers: int,
        download_url: str
    ):
        """
        Send job completion notification email.

        Args:
            to_email: User's email address
            user_name: User's name
            job_name: Name of the completed job
            total_papers: Number of papers found
            download_url: URL to download results
        """
        subject = f"Your search '{job_name}' is complete"

        html_template = """
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
                    <p>Hello {{ user_name }},</p>

                    <p>Great news! Your literature search "<strong>{{ job_name }}</strong>" has completed successfully.</p>

                    <div class="stats">
                        <h3>Results Summary</h3>
                        <p><strong>Papers Found:</strong> {{ total_papers }}</p>
                    </div>

                    <p>Your results are ready to download:</p>

                    <a href="{{ download_url }}" class="button">Download CSV Results</a>

                    <p>This file contains all the paper titles, abstracts, authors, and other metadata extracted from Google Scholar.</p>

                    <p>Thank you for using LitRevTool!</p>

                    <p style="color: #666; font-size: 0.9em; margin-top: 30px;">
                        If you have any questions or feedback, please don't hesitate to reach out.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        text_template = """
        Hello {{ user_name }},

        Great news! Your literature search "{{ job_name }}" has completed successfully.

        Papers Found: {{ total_papers }}

        Download your results here:
        {{ download_url }}

        This file contains all the paper titles, abstracts, authors, and other metadata extracted from Google Scholar.

        Thank you for using LitRevTool!
        """

        # Render templates
        html_tmpl = Template(html_template)
        text_tmpl = Template(text_template)

        html_content = html_tmpl.render(
            user_name=user_name,
            job_name=job_name,
            total_papers=total_papers,
            download_url=download_url
        )

        text_content = text_tmpl.render(
            user_name=user_name,
            job_name=job_name,
            total_papers=total_papers,
            download_url=download_url
        )

        # Send email (synchronous for Celery)
        self.send_email_sync(to_email, subject, html_content, text_content)
