const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@eppione.com";

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

/**
 * Placeholder email sender — logs to console.
 * Replace with nodemailer / SendGrid / Resend when ready.
 */
export async function sendEmail({ to, subject, body }: SendEmailParams) {
  console.log("--- EMAIL ---");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${body}`);
  console.log("--- END EMAIL ---");
}

export async function notifyAdminNewRegistration(user: {
  name: string;
  email: string;
  companyName: string;
}) {
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: "New User Registration — Eppione Benchmarking",
    body: [
      `A new user has registered and is awaiting approval.`,
      ``,
      `Name: ${user.name}`,
      `Email: ${user.email}`,
      `Company: ${user.companyName}`,
      ``,
      `Log in to the admin panel to review: ${process.env.NEXTAUTH_URL}/admin`,
    ].join("\n"),
  });
}

export async function notifyUserApproved(user: {
  name: string;
  email: string;
}) {
  await sendEmail({
    to: user.email,
    subject: "Your Eppione Account Has Been Approved",
    body: [
      `Hi ${user.name},`,
      ``,
      `Your Eppione Benchmarking account has been approved. You can now sign in and start benchmarking your employee benefits.`,
      ``,
      `Sign in: ${process.env.NEXTAUTH_URL}/login`,
      ``,
      `— The Eppione Team`,
    ].join("\n"),
  });
}

export async function notifyUserRejected(user: {
  name: string;
  email: string;
}) {
  await sendEmail({
    to: user.email,
    subject: "Eppione Account Registration Update",
    body: [
      `Hi ${user.name},`,
      ``,
      `Unfortunately, your Eppione Benchmarking account registration was not approved at this time.`,
      ``,
      `If you believe this is an error, please contact us at support@eppione.com.`,
      ``,
      `— The Eppione Team`,
    ].join("\n"),
  });
}
