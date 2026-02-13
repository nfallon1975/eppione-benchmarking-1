import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { randomBytes } from "crypto";
import { brokerClientRowSchema, type BrokerClientUploadRow } from "@/lib/upload-schemas";
import { BenefitCategory } from "@prisma/client";
import { ensureCountryConfigs } from "@/lib/country-config";

const requestSchema = z.object({
  rows: z.array(brokerClientRowSchema),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== "BROKER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const brokerId = session.user.id;
    const body = await req.json();
    const { rows } = requestSchema.parse(body);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No rows provided" },
        { status: 400 }
      );
    }

    // Ensure CountryConfig exists for all countries in the upload
    const allCountries = Array.from(new Set(rows.map((r) => r.country)));
    await ensureCountryConfigs(allCountries);

    // Group rows by companyEmail
    const byCompany = new Map<string, BrokerClientUploadRow[]>();
    for (const row of rows) {
      const email = row.companyEmail.toLowerCase();
      if (!byCompany.has(email)) byCompany.set(email, []);
      byCompany.get(email)!.push(row);
    }

    let companiesCreated = 0;
    let companiesUpdated = 0;
    let entriesCreated = 0;
    const uploadedCompanies: { name: string; email: string; isNew: boolean; benefitCount: number }[] = [];

    await prisma.$transaction(async (tx) => {
      for (const [companyEmail, companyRows] of Array.from(byCompany.entries())) {
        const firstRow = companyRows[0];

        // Check if a user with this email already exists (CLIENT)
        const existingUser = await tx.user.findUnique({
          where: { email: companyEmail },
          include: { company: true },
        });

        let companyId: string;
        let isNew = false;

        if (existingUser?.companyId) {
          // Existing company — update it
          companyId = existingUser.companyId;
          await tx.company.update({
            where: { id: companyId },
            data: {
              name: firstRow.companyName,
              industry: firstRow.industry,
              employeeCount: firstRow.employeeCount,
              employeeCountRange: firstRow.employeeCountRange || null,
            },
          });
          companiesUpdated++;
        } else {
          // New company — create Company record (NO User created, NO invite)
          const primaryCountry = firstRow.country.toUpperCase();
          const company = await tx.company.create({
            data: {
              name: firstRow.companyName,
              country: primaryCountry,
              industry: firstRow.industry,
              employeeCount: firstRow.employeeCount,
              employeeCountRange: firstRow.employeeCountRange || null,
            },
          });
          companyId = company.id;
          companiesCreated++;
          isNew = true;
        }

        // Create BrokerClientRelationship with UPLOADED status (no invite sent)
        const existingRel = await tx.brokerClientRelationship.findFirst({
          where: { brokerId, inviteEmail: companyEmail },
        });

        if (!existingRel) {
          const inviteToken = randomBytes(32).toString("hex");
          await tx.brokerClientRelationship.create({
            data: {
              brokerId,
              companyId,
              inviteEmail: companyEmail,
              inviteToken,
              status: "UPLOADED",
            },
          });
        } else if (!existingRel.companyId) {
          await tx.brokerClientRelationship.update({
            where: { id: existingRel.id },
            data: { companyId },
          });
        }

        // Get unique countries from rows for this company
        const countries = Array.from(new Set(companyRows.map((r: BrokerClientUploadRow) => r.country.toUpperCase())));

        // Create/update CompanyCountryProfiles
        for (const country of countries) {
          await tx.companyCountryProfile.upsert({
            where: { companyId_country: { companyId, country } },
            create: { companyId, country },
            update: {},
          });
        }

        // Delete existing BenefitEntries for this company where countries overlap
        await tx.benefitEntry.deleteMany({
          where: { companyId, country: { in: countries } },
        });

        // Create new BenefitEntries
        let companyEntries = 0;
        for (const row of companyRows) {
          await tx.benefitEntry.create({
            data: {
              companyId,
              benefitCategory: row.benefitCategory as BenefitCategory,
              country: row.country.toUpperCase(),
              benefitName: row.benefitName,
              coverLevel: row.coverLevel,
              employerFunded: row.employerFunded,
              employeeContributionPercent: row.employeeContributionPercent,
              coversSpouse: row.coversSpouse,
              coversDependents: row.coversDependents,
              isCore: row.isCore,
              isVoluntary: row.isVoluntary,
              isFlexible: row.isFlexible,
              surveySource: false,
              provider: row.provider || null,
              annualCostPerEmployee: row.annualCostPerEmployee,
              costCurrency: row.costCurrency || "EUR",
              notes: row.notes || null,
              healthExcess: row.healthExcess,
              healthCopayPercent: row.healthCopayPercent,
              healthInpatientLimit: row.healthInpatientLimit,
              healthOutpatientLimit: row.healthOutpatientLimit,
              lifeCoverMultiple: row.lifeCoverMultiple,
              lifeFixedCoverAmount: row.lifeFixedCoverAmount,
              ipBenefitPercent: row.ipBenefitPercent,
              ipWaitingPeriodWeeks: row.ipWaitingPeriodWeeks,
              ciCoverMultiple: row.ciCoverMultiple,
              ciFixedCoverAmount: row.ciFixedCoverAmount,
              dentalAnnualLimit: row.dentalAnnualLimit,
              dentalOrthoIncluded: row.dentalOrthoIncluded,
              pensionEmployerPct: row.pensionEmployerPct,
              pensionEmployeePct: row.pensionEmployeePct,
            },
          });
          entriesCreated++;
          companyEntries++;
        }

        // Set surveyCompletedAt
        await tx.company.update({
          where: { id: companyId },
          data: { surveyCompletedAt: new Date() },
        });

        uploadedCompanies.push({
          name: firstRow.companyName,
          email: companyEmail,
          isNew,
          benefitCount: companyEntries,
        });
      }
    });

    return NextResponse.json({
      success: true,
      companiesProcessed: byCompany.size,
      companiesCreated,
      companiesUpdated,
      entriesCreated,
      companies: uploadedCompanies,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error uploading broker clients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
