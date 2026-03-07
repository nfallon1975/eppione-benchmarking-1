import { prisma } from "@/lib/db";

type NotificationType =
  | "REVIEW_CRITICAL"
  | "REVIEW_HIGH"
  | "REVIEW_COMPLETE"
  | "REGULATORY_UPDATE"
  | "SOURCE_EXPIRED"
  | "COMPLIANCE_CHANGE"
  | "SYSTEM";

/**
 * Send a notification to a specific user.
 */
export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  linkUrl?: string
) {
  return prisma.notification.create({
    data: {
      userId,
      type: type as never,
      title,
      message,
      linkUrl,
    },
  });
}

/**
 * Send a notification to all admin users.
 */
export async function notifyAdmins(
  type: NotificationType,
  title: string,
  message: string,
  linkUrl?: string
) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: type as never,
      title,
      message,
      linkUrl,
    })),
  });
}

/**
 * Send notifications after a review cycle completes.
 */
export async function notifyReviewComplete(cycleId: string) {
  const cycle = await prisma.monthlyReviewCycle.findUnique({
    where: { id: cycleId },
    include: {
      findings: {
        select: { severity: true, findingType: true, country: true, linkedId: true },
      },
    },
  });

  if (!cycle) return;

  const criticalCount = cycle.findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = cycle.findings.filter((f) => f.severity === "HIGH").length;

  // Notify admins
  if (criticalCount > 0) {
    await notifyAdmins(
      "REVIEW_CRITICAL",
      `Critical findings in ${cycle.month} review`,
      `Monthly review found ${criticalCount} critical finding(s) across ${cycle.countriesReviewed.join(", ")}. Immediate review required.`,
      `/admin/reviews`
    );
  } else if (highCount > 0) {
    await notifyAdmins(
      "REVIEW_HIGH",
      `High-priority findings in ${cycle.month} review`,
      `Monthly review found ${highCount} high-priority finding(s). Please review at your earliest convenience.`,
      `/admin/reviews`
    );
  } else {
    await notifyAdmins(
      "REVIEW_COMPLETE",
      `${cycle.month} review completed`,
      `Monthly data review completed. ${cycle.totalDataPointsReviewed} data points reviewed, ${cycle.totalUpdatesFound} updates found.`,
      `/admin/reviews`
    );
  }

  // Notify affected clients if CRITICAL regulatory changes
  const criticalRegFindings = cycle.findings.filter(
    (f) => f.severity === "CRITICAL" && f.findingType === "NEW_REGULATION"
  );

  if (criticalRegFindings.length > 0) {
    const affectedCountries = new Set(criticalRegFindings.map((f) => f.country));
    const clients = await prisma.user.findMany({
      where: {
        role: "CLIENT",
        status: "APPROVED",
        company: {
          country: { in: Array.from(affectedCountries) },
        },
      },
      select: { id: true },
    });

    for (const client of clients) {
      await notify(
        client.id,
        "REGULATORY_UPDATE",
        "Regulatory update may affect your compliance",
        `New regulatory changes have been identified that may affect your benefits compliance. Please review your compliance dashboard.`,
        `/dashboard/compliance`
      );
    }
  }
}

/**
 * Notify brokers when compliance data they contributed is updated.
 */
export async function notifyBrokerDataUpdate(
  brokerId: string,
  country: string,
  description: string
) {
  await notify(
    brokerId,
    "COMPLIANCE_CHANGE",
    `Compliance data updated for ${country}`,
    description,
    `/broker/compliance`
  );
}
