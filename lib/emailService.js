import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Two transports are supported, tried in this order:
//
//   1. SMTP (SMTP_HOST/SMTP_USER/SMTP_PASSWORD) — used for Zoho. Works with both
//      Zoho Mail (smtppro.zoho.com) and ZeptoMail (smtp.zeptomail.com).
//   2. Resend (RESEND_API_KEY) — the original transport, kept so existing
//      deployments keep working if SMTP is not configured.
//
// With neither configured, sends are skipped with a warning and the caller gets
// `{ success: false }`. Nothing here ever throws, because callers deliberately
// fire-and-forget these emails and must not have a request fail on a mail error.

let resendClient = null;
let smtpTransport = null;

function getResendClient() {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || 465);

  smtpTransport = nodemailer.createTransport({
    host,
    port,
    // 465 is implicit TLS. 587 connects in the clear and upgrades via STARTTLS,
    // so `secure` must be false there or the handshake never completes.
    secure: port === 465,
    auth: { user, pass },
    // Serverless invocations are short-lived, so a connection pool would just
    // leave sockets to be torn down. Bounded timeouts stop a stalled SMTP
    // handshake from holding the function open until the platform kills it.
    pool: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  return smtpTransport;
}

// Both transports police the sender: Zoho rejects a From that isn't the
// authenticated mailbox or a verified alias, and Resend rejects one whose domain
// isn't verified on the account. So default to SMTP_USER rather than inventing a
// sender, and keep MAIL_FROM on a domain the active transport actually owns.
function getFromAddress() {
  const address =
    process.env.MAIL_FROM ||
    process.env.SMTP_USER ||
    process.env.RESEND_FROM_EMAIL ||
    'onboarding@resend.dev';
  const name = process.env.MAIL_FROM_NAME;
  return name ? `${name} <${address}>` : address;
}

/**
 * Deliver one email through whichever transport is configured.
 * Resolves `{ success, messageId }` or `{ success, error }` — never throws.
 */
async function deliver({ to, subject, html }) {
  const from = getFromAddress();

  try {
    const transport = getSmtpTransport();
    if (transport) {
      const info = await transport.sendMail({ from, to, subject, html });
      return { success: true, messageId: info.messageId };
    }

    const client = getResendClient();
    if (!client) {
      console.warn(
        'No email transport configured (set SMTP_HOST/SMTP_USER/SMTP_PASSWORD, or RESEND_API_KEY) - email not sent'
      );
      return { success: false, error: 'Email service not configured' };
    }

    const response = await client.emails.send({ from, to, subject, html });
    if (response.error) {
      console.error('Resend API error:', response.error);
      return { success: false, error: response.error.message };
    }
    return { success: true, messageId: response.data.id };
  } catch (error) {
    console.error('Email sending error:', error.message);
    return { success: false, error: error.message };
  }
}

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://pravyo.infobytesnepal.com';

/**
 * Branded logo band placed at the top of every email.
 *
 * The image has to be an absolute hosted URL: Gmail and Outlook strip `data:`
 * URIs, so an inlined base64 logo silently renders as a broken image. Styles are
 * inline rather than in the <style> block because several clients drop embedded
 * stylesheets, and the `width`/`height` attributes are duplicated alongside the
 * CSS because Outlook ignores the CSS ones.
 *
 * The band is white on purpose — the mark is navy with white cut-outs, so on the
 * navy header below it the logo all but disappears.
 */
function logoBlock() {
  return `
    <div style="background-color:#ffffff;padding:24px 0 8px;text-align:center;">
      <a href="${SITE_URL}" style="text-decoration:none;border:0;">
        <img src="${SITE_URL}/pravyo-icon.png?v=2"
             alt="Pravyo"
             width="56"
             height="56"
             style="display:inline-block;width:56px;height:56px;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />
      </a>
    </div>
  `;
}

/**
 * Send student login credentials to a parent.
 */
export async function sendStudentCredentialsEmail(
  parentEmail,
  parentName,
  studentName,
  username,
  password
) {
  const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
            .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 4px; text-align: center; }
            .content { padding: 20px 0; }
            .field { margin: 15px 0; }
            .label { font-weight: bold; color: #333; }
            .value { background-color: #f0f0f0; padding: 10px; border-radius: 4px; font-family: monospace; margin-top: 5px; }
            .footer { color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
            .warning { background-color: #fef3c7; border: 1px solid #fbbf24; color: #92400e; padding: 10px; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            ${logoBlock()}
            <div class="header">
              <h1>Student Login Credentials</h1>
            </div>

            <div class="content">
              <p>Dear <strong>${parentName}</strong>,</p>

              <p>
                Your child <strong>${studentName}</strong> has been successfully registered in our school management system.
                Below are the login credentials for accessing the student account.
              </p>

              <div class="field">
                <div class="label">Username:</div>
                <div class="value">${username}</div>
              </div>

              <div class="field">
                <div class="label">Password:</div>
                <div class="value">${password}</div>
              </div>

              <div class="warning">
                <strong>⚠️ Important:</strong> Please keep these credentials safe. 
                We recommend changing the password on the first login.
              </div>

              <p>
                <strong>Next Steps:</strong>
              </p>
              <ul>
                <li>Log in to the student portal using the credentials above</li>
                <li>Change the password to something only you know</li>
                <li>Update any additional student information if needed</li>
                <li>Contact school administration if you need assistance</li>
              </ul>

              <p>
                Best regards,<br>
                <strong>School Management System</strong>
              </p>
            </div>

            <div class="footer">
              <p>
                This email was sent automatically. Please do not reply to this email.
                If you have questions, please contact your school administration.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

  return deliver({
    to: parentEmail,
    subject: `Student Login Credentials - ${studentName}`,
    html: emailHtml,
  });
}

function wrapEmailBody(title, bodyHtml) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
          .header { background-color: #1f4e79; color: white; padding: 20px; border-radius: 4px; text-align: center; }
          .content { padding: 20px 0; }
          .button { display: inline-block; background-color: #1f4e79; color: white !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 10px 0; }
          .footer { color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          ${logoBlock()}
          <div class="header"><h1>${title}</h1></div>
          <div class="content">${bodyHtml}</div>
          <div class="footer">
            <p>
              This email was sent automatically by Pravyo. If you have questions,
              reply to this email or visit ${SITE_URL}/contact.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Confirmation sent right after a school submits its registration.
 */
export async function sendSchoolRegistrationReceivedEmail(email, schoolName) {
  return deliver({
    to: email,
    subject: `Registration received - ${schoolName}`,
    html: wrapEmailBody(
      'Registration Received',
      `
        <p>Dear <strong>${schoolName}</strong> team,</p>
        <p>
          Thank you for registering on Pravyo. Your school account has been
          created and is now <strong>waiting for review</strong> by our team.
        </p>
        <p>
          You will receive another email as soon as your account is approved.
          Review usually happens within 1-2 business days.
        </p>
        <p>
          Best regards,<br />
          <strong>The Pravyo Team</strong>
        </p>
      `
    ),
  });
}

/**
 * Welcome email sent when the super admin approves a school account.
 */
export async function sendSchoolApprovalEmail(email, schoolName) {
  return deliver({
    to: email,
    subject: `Your school is approved - welcome to Pravyo!`,
    html: wrapEmailBody(
      'Welcome to Pravyo',
      `
        <p>Dear <strong>${schoolName}</strong> team,</p>
        <p>
          Great news - your school account has been <strong>approved</strong>.
          You now have full access to your school dashboard.
        </p>
        <p style="text-align:center;">
          <a class="button" href="${SITE_URL}/login">Log in to your dashboard</a>
        </p>
        <p><strong>Suggested first steps:</strong></p>
        <ul>
          <li>Set up your public school profile (Showcase tab)</li>
          <li>Register your students and teachers</li>
          <li>Create your first school event or notice</li>
        </ul>
        <p>
          Best regards,<br />
          <strong>The Pravyo Team</strong>
        </p>
      `
    ),
  });
}
