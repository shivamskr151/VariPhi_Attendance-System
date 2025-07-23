const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Email configuration is now hardcoded for variphi.com SMTP
    console.log('📧 Initializing email service with variphi.com SMTP configuration...');

    try {
      // Create transporter with custom SMTP configuration for variphi.com
      this.transporter = nodemailer.createTransport({
        host: 'smtpout.secureserver.net',
        port: 465,
        secure: true, // true for 465
        auth: {
          user: 'information@variphi.com',
          pass: 'Nextneural@2402'
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Test the connection
      this.transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email configuration error:', error.message);
          console.log('   Email functionality will be disabled. Please check your email settings.');
          this.transporter = null;
        } else {
          console.log('✅ Email service initialized successfully');
        }
      });
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error.message);
      this.transporter = null;
    }
  }

  async sendEmail(options) {
    try {
      if (!this.transporter) {
        console.log('⚠️  Email not sent: Email service not configured');
        console.log('   Email service is configured for variphi.com SMTP');
        return { messageId: 'email-disabled', status: 'skipped' };
      }

      const mailOptions = {
        from: 'information@variphi.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        messageId: `<${require('crypto').randomUUID()}@variphi.com>`
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Error sending email:', error.message);
      // Don't throw error, just log it and return a mock result
      return { messageId: 'email-failed', status: 'failed', error: error.message };
    }
  }

  async sendInvitationEmail(employee, invitationToken, baseUrl) {
    const invitationLink = `${baseUrl}/accept-invitation?token=${invitationToken}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Attendance System</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .info { background: #e3f2fd; padding: 15px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏢 Welcome to Attendance System</h1>
          </div>
          <div class="content">
            <h2>Hello ${employee.firstName} ${employee.lastName}!</h2>
            
            <p>You have been invited to join our Attendance Management System. This system will help you:</p>
            
            <ul>
              <li>📱 Mark your attendance from anywhere</li>
              <li>📅 Request and manage your leaves</li>
              <li>📊 View your attendance history and reports</li>
              <li>🔔 Receive real-time notifications</li>
            </ul>
            
            <div class="info">
              <strong>Your Account Details:</strong><br>
              Employee ID: ${employee.employeeId}<br>
              Department: ${employee.department}<br>
              Position: ${employee.position}
            </div>
            
            <p>To get started, please click the button below to accept your invitation and set up your account:</p>
            
            <a href="${invitationLink}" class="button">Accept Invitation & Set Up Account</a>
            
            <p><strong>Important:</strong> This invitation link will expire in 7 days for security reasons.</p>
            
            <p>If you have any questions or need assistance, please contact your administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from the Attendance System.<br>
            Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Welcome to Attendance System

Hello ${employee.firstName} ${employee.lastName}!

You have been invited to join our Attendance Management System. This system will help you:
- Mark your attendance from anywhere
- Request and manage your leaves
- View your attendance history and reports
- Receive real-time notifications

Your Account Details:
Employee ID: ${employee.employeeId}
Department: ${employee.department}
Position: ${employee.position}

To get started, please visit this link to accept your invitation and set up your account:
${invitationLink}

Important: This invitation link will expire in 7 days for security reasons.

If you have any questions or need assistance, please contact your administrator.

This is an automated message from the Attendance System.
Please do not reply to this email.
    `;

    return this.sendEmail({
      to: employee.email,
      subject: 'Welcome to Attendance System - Accept Your Invitation',
      html: htmlContent,
      text: textContent
    });
  }

  async sendPasswordResetEmail(employee, resetToken, baseUrl) {
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f44336; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #f44336; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #ffc107; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${employee.firstName} ${employee.lastName}!</h2>
            
            <p>We received a request to reset your password for your Attendance System account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <a href="${resetLink}" class="button">Reset Password</a>
            
            <div class="warning">
              <strong>Security Notice:</strong>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p>${resetLink}</p>
          </div>
          <div class="footer">
            <p>This is an automated message from the Attendance System.<br>
            Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: employee.email,
      subject: 'Password Reset Request - Attendance System',
      html: htmlContent,
      text: `Password Reset Request\n\nHello ${employee.firstName},\n\nWe received a request to reset your password. Please visit: ${resetLink}\n\nThis link expires in 1 hour.`
    });
  }

  async sendWelcomeEmail(employee, baseUrl) {
    const loginLink = `${baseUrl}/login`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Attendance System</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4caf50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #4caf50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to Attendance System!</h1>
          </div>
          <div class="content">
            <h2>Hello ${employee.firstName} ${employee.lastName}!</h2>
            
            <p>Your account has been successfully set up and you're now ready to use the Attendance System!</p>
            
            <p>You can now:</p>
            <ul>
              <li>📱 Log in to your account</li>
              <li>⏰ Mark your attendance</li>
              <li>📅 Request leaves</li>
              <li>📊 View your reports</li>
            </ul>
            
            <a href="${loginLink}" class="button">Login to Your Account</a>
            
            <p>If you have any questions or need assistance, please contact your administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from the Attendance System.<br>
            Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: employee.email,
      subject: 'Welcome to Attendance System - Your Account is Ready!',
      html: htmlContent,
      text: `Welcome to Attendance System!\n\nHello ${employee.firstName},\n\nYour account has been successfully set up. You can now login at: ${loginLink}`
    });
  }
}

module.exports = new EmailService(); 