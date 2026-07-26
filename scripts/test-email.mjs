/**
 * Verify the configured email transport end to end.
 *
 *   npm run mail:test -- you@example.com
 *
 * Checks the SMTP credentials with a real handshake first (so a bad password
 * reports as an auth failure rather than a silent non-delivery), then sends the
 * genuine school-approval template through lib/emailService.js — the same code
 * path the app uses when an admin approves a school.
 */
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config({ path: ".env.local" });
dotenv.config();

const recipient = process.argv[2];
if (!recipient) {
  console.error("Usage: npm run mail:test -- recipient@example.com");
  process.exit(1);
}

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, MAIL_FROM, RESEND_API_KEY } =
  process.env;

console.log("Transport configuration");
console.log("  SMTP_HOST     :", SMTP_HOST || "(unset)");
console.log("  SMTP_PORT     :", SMTP_PORT || "(unset, defaults to 465)");
console.log("  SMTP_USER     :", SMTP_USER || "(unset)");
console.log("  SMTP_PASSWORD :", SMTP_PASSWORD ? `set, ${SMTP_PASSWORD.length} chars` : "(unset)");
console.log("  MAIL_FROM     :", MAIL_FROM || "(unset, falls back to SMTP_USER)");
console.log("  RESEND_API_KEY:", RESEND_API_KEY ? "set" : "(unset)");
console.log();

const usingSmtp = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASSWORD);

if (!usingSmtp && !RESEND_API_KEY) {
  console.error("No transport configured. In .env.local set either:");
  console.error("  RESEND_API_KEY                              (Resend), or");
  console.error("  SMTP_HOST + SMTP_USER + SMTP_PASSWORD       (Zoho)");
  process.exit(1);
}

console.log(usingSmtp ? "Using SMTP transport.\n" : "Using Resend transport.\n");

if (usingSmtp) {
  const port = Number(SMTP_PORT || 465);
  console.log(`Verifying SMTP login to ${SMTP_HOST}:${port} as ${SMTP_USER} ...`);
  const probe = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });

  try {
    await probe.verify();
    console.log("SMTP login OK.\n");
  } catch (error) {
    console.error("SMTP login FAILED:", error.message);
    console.error("\nCommon causes:");
    console.error("  535 auth failed  -> wrong password, or you need an app-specific");
    console.error("                      password because 2FA is on. For ZeptoMail the");
    console.error("                      user must be literally 'emailapikey'.");
    console.error("  Free-plan block  -> Zoho Mail's free plan does not permit SMTP;");
    console.error("                      upgrade to Mail Lite or use ZeptoMail.");
    console.error("  Timeout / ETIMEDOUT -> wrong host for your datacenter, or the");
    console.error("                      port is blocked. Try 587 instead of 465.");
    process.exit(1);
  }
}

// Imported after the probe so a credential problem is reported clearly first.
const { sendSchoolApprovalEmail } = await import("../lib/emailService.js");

console.log(`Sending the school-approval template to ${recipient} ...`);
const result = await sendSchoolApprovalEmail(recipient, "Test School");

if (result.success) {
  console.log("Sent. Message id:", result.messageId);
  console.log("\nIf it does not arrive, check the spam folder, then confirm SPF and");
  console.log("DKIM are published for the sending domain.");
} else {
  console.error("Send failed:", result.error);
  if (!usingSmtp) {
    console.error("\nCommon Resend causes:");
    console.error("  403 / 'You can only send testing emails to your own address'");
    console.error("      -> the sending domain is not verified yet. Until it is,");
    console.error("         Resend only allows From onboarding@resend.dev and only");
    console.error("         delivers to the address you signed up with. Verify the");
    console.error("         domain at resend.com/domains, then set MAIL_FROM to an");
    console.error("         address on it.");
    console.error("  403 domain not verified -> DNS records still pending. Records");
    console.error("      on Cloudflare must be proxy status 'DNS only' (grey cloud).");
  }
  process.exit(1);
}
