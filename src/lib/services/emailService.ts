// src/lib/services/emailService.ts
import nodemailer from 'nodemailer';

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationToken: string
): Promise<void> {
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${verificationToken}`;

  console.log('\n📧 [sendVerificationEmail] Called with:');
  console.log('  To:', email);
  console.log('  Name:', name);
  console.log('  Token (first 10):', verificationToken.substring(0, 10) + '...');
  console.log('  Verification URL:', verificationUrl);
  console.log('  From:', process.env.EMAIL_FROM || process.env.SMTP_USER);

  const transporter = createTransporter();

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Cargo Tracking'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: generateVerificationEmailHTML(name, verificationUrl),
    });

    console.log('✅ [sendVerificationEmail] Email sent successfully!');
    console.log('  Message ID:', info.messageId);
    console.log('  Response:', info.response);
    console.log('  Accepted:', info.accepted);
    console.log('  Rejected:', info.rejected);
  } catch (error: any) {
    console.error('❌ [sendVerificationEmail] FAILED to send email!');
    console.error('  Error name:', error.name);
    console.error('  Error message:', error.message);
    console.error('  Error code:', error.code);
    console.error('  Full error:', error);
    throw error;
  }
}

export async function sendInvoiceEmail(
  invoice: any,
  recipientEmail: string
): Promise<void> {
  const customerName = invoice.customerId?.name || invoice.customerId?.companyName || 'Customer';

  console.log('📧 [sendInvoiceEmail] Sending to:', recipientEmail);

  const transporter = createTransporter();

  const info = await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || 'Cargo Tracking'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to: recipientEmail,
    subject: `Invoice ${invoice.invoiceNumber}`,
    html: generateInvoiceEmailHTML(invoice),
  });

  console.log('✅ [sendInvoiceEmail] Sent! Message ID:', info.messageId);
}

function generateVerificationEmailHTML(name: string, verificationUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .header .emoji { font-size: 48px; margin-bottom: 10px; }
          .content { padding: 40px 30px; }
          .greeting { font-size: 18px; margin-bottom: 20px; color: #333; }
          .message { color: #6b7280; line-height: 1.8; margin: 20px 0; font-size: 16px; }
          .button-container { text-align: center; margin: 40px 0; }
          .button { display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
          .info-box { background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 4px; }
          .info-box p { margin: 0; color: #1e40af; font-size: 14px; }
          .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
          .footer p { margin: 8px 0; color: #6b7280; font-size: 13px; }
          .link { color: #667eea; text-decoration: none; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="emoji">✉️</div>
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <p class="greeting">Hello ${name},</p>
            <p class="message">Thank you for registering with Cargo Tracking! Please verify your email address:</p>
            <div class="button-container">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            <div class="info-box">
              <p><strong>⏰ This link will expire in 24 hours</strong></p>
            </div>
            <p class="message" style="font-size: 14px; color: #9ca3af;">If the button doesn't work, copy and paste this link:</p>
            <p style="font-size: 14px;"><a href="${verificationUrl}" class="link">${verificationUrl}</a></p>
            <p class="message" style="margin-top: 30px; font-size: 14px; color: #9ca3af;">If you didn't create an account, please ignore this email.</p>
          </div>
          <div class="footer">
            <p><strong>Cargo Tracking System</strong></p>
            <p>This is an automated message, please do not reply directly to this email</p>
            <p>&copy; ${new Date().getFullYear()} Cargo Tracking. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateInvoiceEmailHTML(invoice: any): string {
  const customerName = invoice.customerId?.name || invoice.customerId?.companyName || 'Customer';
  const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoice._id}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; background: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 40px 30px; }
          .invoice-details { margin: 30px 0; padding: 25px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #667eea; }
          .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: 600; color: #6b7280; font-size: 14px; }
          .amount-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 8px; text-align: center; margin: 30px 0; }
          .amount-value { font-size: 36px; font-weight: 700; }
          .button-container { text-align: center; margin: 30px 0; }
          .button { display: inline-block; padding: 14px 40px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
          .footer { background: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
          .footer p { margin: 8px 0; color: #6b7280; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>📄 Invoice Received</h1></div>
          <div class="content">
            <p>Hello ${customerName},</p>
            <p>Please find the details of your invoice below:</p>
            <div class="invoice-details">
              <div class="detail-row"><span class="label">Invoice Number</span><span>${invoice.invoiceNumber}</span></div>
              <div class="detail-row"><span class="label">Issue Date</span><span>${invoice.date ? new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span></div>
              <div class="detail-row"><span class="label">Due Date</span><span>${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span></div>
              <div class="detail-row"><span class="label">Status</span><span>${invoice.status}</span></div>
            </div>
            <div class="amount-box">
              <div style="font-size:14px;opacity:0.9;margin-bottom:8px;">Total Amount Due</div>
              <div class="amount-value">${invoice.totalAmount ? Number(invoice.totalAmount).toFixed(2) : '0.00'}</div>
            </div>
            <div class="button-container">
              <a href="${invoiceUrl}" class="button">View Invoice Details</a>
            </div>
            <p>Best regards,<br><strong>Cargo Tracking Team</strong></p>
          </div>
          <div class="footer">
            <p><strong>This is an automated message</strong></p>
            <p>&copy; ${new Date().getFullYear()} Cargo Tracking System. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}