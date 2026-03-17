import { Resend } from "resend";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@eppione.com";
const EMAIL_FROM =
  process.env.EMAIL_FROM || "Eppione Benchmarking <noreply@eppione.com>";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail({ to, subject, body }: SendEmailParams) {
  if (!resend) {
    console.log("--- EMAIL (no RESEND_API_KEY, logging only) ---");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:\n${body}`);
    console.log("--- END EMAIL ---");
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      text: body,
    });
    if (error) {
      console.error("Resend error:", error);
    } else {
      console.log(`Email sent to ${to}: ${subject}`);
    }
  } catch (err) {
    console.error("Failed to send email:", err);
  }
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

export async function notifyBrokerCreated(user: {
  name: string;
  email: string;
  companyName: string;
}) {
  await sendEmail({
    to: user.email,
    subject: "You've been invited to Eppione Benchmarking",
    body: [
      `Hi ${user.name},`,
      ``,
      `An admin has created a broker account for you on Eppione Benchmarking.`,
      ``,
      `Firm: ${user.companyName}`,
      ``,
      `You can sign in via the login page to get started:`,
      `${process.env.NEXTAUTH_URL}/login`,
      ``,
      `— The Eppione Team`,
    ].join("\n"),
  });
}

export async function notifyBrokerInvite(params: {
  clientEmail: string;
  brokerName: string;
  brokerFirm: string;
  inviteToken: string;
}) {
  const inviteUrl = `${process.env.NEXTAUTH_URL}/register?invite=${params.inviteToken}`;
  await sendEmail({
    to: params.clientEmail,
    subject: `${params.brokerFirm} has invited you to Eppione Benchmarking`,
    body: [
      `Hi,`,
      ``,
      `${params.brokerName} from ${params.brokerFirm} has invited you to join Eppione Benchmarking.`,
      ``,
      `Eppione helps companies benchmark their employee benefits across countries and industries.`,
      ``,
      `Register here: ${inviteUrl}`,
      ``,
      `— The Eppione Team`,
    ].join("\n"),
  });
}

export async function notifyBrokerClientAccepted(params: {
  brokerEmail: string;
  clientName: string;
  clientCompanyName: string;
}) {
  await sendEmail({
    to: params.brokerEmail,
    subject: "A client has accepted your invite — Eppione Benchmarking",
    body: [
      `Hi,`,
      ``,
      `${params.clientName} from ${params.clientCompanyName} has accepted your invitation and joined Eppione Benchmarking.`,
      ``,
      `You can now view their benchmarking data from your broker dashboard.`,
      ``,
      `Dashboard: ${process.env.NEXTAUTH_URL}/broker/clients`,
      ``,
      `— The Eppione Team`,
    ].join("\n"),
  });
}
