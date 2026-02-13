"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  COUNTRY_LABELS,
  NACE_INDUSTRIES,
  BENEFIT_CATEGORY_LABELS,
  PLATFORM_TYPE_LABELS,
  FEE_MODEL_LABELS,
  MONTH_LABELS,
  formatCurrency,
} from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

interface BenefitEntry {
  id: string;
  benefitCategory: string;
  country: string;
  benefitName: string;
  coverLevel: string;
  employerFunded: boolean;
  employeeContributionPercent: number | null;
  coversSpouse: boolean;
  coversDependents: boolean;
  maxDependents: number | null;
  isCore: boolean;
  isVoluntary: boolean;
  isFlexible: boolean;
  flexFundAmount: number | null;
  flexFundCurrency: string | null;
  provider: string | null;
  annualCostPerEmployee: number | null;
  costCurrency: string;
  notes: string | null;
  healthExcess: number | null;
  healthExcessCurrency: string;
  healthCopayPercent: number | null;
  healthInpatientLimit: number | null;
  healthOutpatientLimit: number | null;
  healthLimitCurrency: string;
  lifeCoverMultiple: number | null;
  lifeFixedCoverAmount: number | null;
  lifeCoverAmountCurrency: string;
  lifeFreeCoverLimit: number | null;
  ipBenefitPercent: number | null;
  ipWaitingPeriodWeeks: number | null;
  ipMaxBenefitAge: number | null;
  ciCoverMultiple: number | null;
  ciFixedCoverAmount: number | null;
  ciCoverAmountCurrency: string;
  dentalAnnualLimit: number | null;
  dentalAnnualLimitCurrency: string;
  dentalOrthoIncluded: boolean | null;
  pensionEmployerPct: number | null;
  pensionEmployeePct: number | null;
  brokerName: string | null;
  brokerSatisfactionScore: number | null;
  renewalDate: string | null;
  benefitSatisfactionScore: number | null;
}

interface PlatformInfo {
  id: string;
  usesPlatform: boolean;
  platformName: string | null;
  platformType: string | null;
  annualPlatformFee: number | null;
  feeCurrency: string;
  feeModel: string | null;
  platformSatisfactionScore: number | null;
  usesTotalRewardPlatform: boolean;
  totalRewardPlatformName: string | null;
  otherHRTechPlatforms: string | null;
}

interface CategoryExclusion {
  id: string;
  benefitCategory: string;
  country: string;
  isCore: boolean;
}

interface CountryProfile {
  id: string;
  country: string;
  employeeCountRange: string | null;
  averageSalary: number | null;
  averageSalaryCurrency: string | null;
  averageBonusPercent: number | null;
  financialYearEndMonth: number | null;
}

interface CompanyDetail {
  id: string;
  name: string;
  country: string;
  industry: string;
  employeeCount: number;
  employeeCountRange: string | null;
  averageSalary: number | null;
  averageSalaryCurrency: string | null;
  averageBonus: number | null;
  averageBonusCurrency: string | null;
  averageBonusPercent: number | null;
  benefitBudget: number | null;
  benefitBudgetCurrency: string;
  averageWorkforceAge: number | null;
  desiredNewBenefits: string | null;
  surveyCompletedAt: string;
  users: User[];
  benefitEntries: BenefitEntry[];
  platformInfo: PlatformInfo[];
  categoryExclusions: CategoryExclusion[];
  countryProfiles: CountryProfile[];
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between border-b border-slate-100 py-2">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

function CategoryDetails({ entry }: { entry: BenefitEntry }) {
  const details: { label: string; value: React.ReactNode }[] = [];

  switch (entry.benefitCategory) {
    case "HEALTH":
      if (entry.healthExcess != null)
        details.push({ label: "Excess", value: formatCurrency(entry.healthExcess, entry.healthExcessCurrency) });
      if (entry.healthCopayPercent != null)
        details.push({ label: "Co-pay", value: `${entry.healthCopayPercent}%` });
      if (entry.healthInpatientLimit != null)
        details.push({ label: "Inpatient Limit", value: formatCurrency(entry.healthInpatientLimit, entry.healthLimitCurrency) });
      if (entry.healthOutpatientLimit != null)
        details.push({ label: "Outpatient Limit", value: formatCurrency(entry.healthOutpatientLimit, entry.healthLimitCurrency) });
      break;
    case "LIFE":
      if (entry.lifeCoverMultiple != null)
        details.push({ label: "Cover Multiple", value: `${entry.lifeCoverMultiple}x salary` });
      if (entry.lifeFixedCoverAmount != null)
        details.push({ label: "Fixed Cover", value: formatCurrency(entry.lifeFixedCoverAmount, entry.lifeCoverAmountCurrency) });
      if (entry.lifeFreeCoverLimit != null)
        details.push({ label: "Free Cover Limit", value: formatCurrency(entry.lifeFreeCoverLimit, entry.lifeCoverAmountCurrency) });
      break;
    case "PENSION":
      if (entry.pensionEmployerPct != null)
        details.push({ label: "Employer %", value: `${entry.pensionEmployerPct}%` });
      if (entry.pensionEmployeePct != null)
        details.push({ label: "Employee %", value: `${entry.pensionEmployeePct}%` });
      break;
    case "INCOME_PROTECTION":
      if (entry.ipBenefitPercent != null)
        details.push({ label: "Benefit %", value: `${entry.ipBenefitPercent}%` });
      if (entry.ipWaitingPeriodWeeks != null)
        details.push({ label: "Waiting Period", value: `${entry.ipWaitingPeriodWeeks} weeks` });
      if (entry.ipMaxBenefitAge != null)
        details.push({ label: "Max Age", value: `${entry.ipMaxBenefitAge}` });
      break;
    case "DENTAL":
      if (entry.dentalAnnualLimit != null)
        details.push({ label: "Annual Limit", value: formatCurrency(entry.dentalAnnualLimit, entry.dentalAnnualLimitCurrency) });
      if (entry.dentalOrthoIncluded != null)
        details.push({ label: "Ortho Included", value: entry.dentalOrthoIncluded ? "Yes" : "No" });
      break;
    case "CRITICAL_ILLNESS":
      if (entry.ciCoverMultiple != null)
        details.push({ label: "Cover Multiple", value: `${entry.ciCoverMultiple}x salary` });
      if (entry.ciFixedCoverAmount != null)
        details.push({ label: "Fixed Cover", value: formatCurrency(entry.ciFixedCoverAmount, entry.ciCoverAmountCurrency) });
      break;
  }

  if (details.length === 0) return null;

  return (
    <div className="mt-1 flex flex-wrap gap-3">
      {details.map((d) => (
        <span key={d.label} className="text-xs text-slate-500">
          {d.label}: <span className="font-medium text-slate-700">{d.value}</span>
        </span>
      ))}
    </div>
  );
}

function ProfileTab({ company }: { company: CompanyDetail }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-1">
          <FieldRow label="Company Name" value={company.name} />
          <FieldRow label="Country" value={COUNTRY_LABELS[company.country] || company.country} />
          <FieldRow label="Industry" value={NACE_INDUSTRIES[company.industry] || company.industry} />
          <FieldRow label="Employee Count" value={company.employeeCount} />
          <FieldRow label="Employee Range" value={company.employeeCountRange} />
        </div>
        <div className="space-y-1">
          <FieldRow
            label="Average Salary"
            value={company.averageSalary != null ? formatCurrency(company.averageSalary, company.averageSalaryCurrency || "EUR") : null}
          />
          <FieldRow label="Average Bonus %" value={company.averageBonusPercent != null ? `${company.averageBonusPercent}%` : null} />
          <FieldRow
            label="Benefit Budget"
            value={company.benefitBudget != null ? formatCurrency(company.benefitBudget, company.benefitBudgetCurrency) : null}
          />
          <FieldRow label="Average Workforce Age" value={company.averageWorkforceAge} />
          <FieldRow label="Desired New Benefits" value={company.desiredNewBenefits} />
          <FieldRow label="Survey Completed" value={new Date(company.surveyCompletedAt).toLocaleDateString()} />
        </div>
      </div>

      {company.countryProfiles.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold text-slate-700">Per-Country Profiles</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Avg Salary</TableHead>
                <TableHead>Bonus %</TableHead>
                <TableHead>FY End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {company.countryProfiles.map((cp) => (
                <TableRow key={cp.id}>
                  <TableCell className="font-medium">
                    {COUNTRY_LABELS[cp.country] || cp.country}
                  </TableCell>
                  <TableCell>{cp.employeeCountRange || "—"}</TableCell>
                  <TableCell>
                    {cp.averageSalary != null
                      ? formatCurrency(cp.averageSalary, cp.averageSalaryCurrency || "EUR")
                      : "—"}
                  </TableCell>
                  <TableCell>{cp.averageBonusPercent != null ? `${cp.averageBonusPercent}%` : "—"}</TableCell>
                  <TableCell>
                    {cp.financialYearEndMonth != null ? MONTH_LABELS[cp.financialYearEndMonth - 1] : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function ContactsTab({ users }: { users: User[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Registered</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name || "—"}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                {user.role}
              </Badge>
            </TableCell>
            <TableCell>
              {user.status === "APPROVED" && <Badge variant="success">Approved</Badge>}
              {user.status === "PENDING" && <Badge variant="warning">Pending</Badge>}
              {user.status === "REJECTED" && <Badge variant="destructive">Rejected</Badge>}
            </TableCell>
            <TableCell className="text-sm text-slate-500">
              {new Date(user.createdAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BenefitsTab({ entries }: { entries: BenefitEntry[] }) {
  // Group by country, then by category
  const grouped: Record<string, Record<string, BenefitEntry[]>> = {};
  for (const entry of entries) {
    const ctry = entry.country || "—";
    if (!grouped[ctry]) grouped[ctry] = {};
    if (!grouped[ctry][entry.benefitCategory]) grouped[ctry][entry.benefitCategory] = [];
    grouped[ctry][entry.benefitCategory].push(entry);
  }

  const countries = Object.keys(grouped).sort();

  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No benefit entries recorded.</p>;
  }

  return (
    <div className="space-y-6">
      {countries.map((ctry) => (
        <div key={ctry}>
          <h4 className="mb-3 text-sm font-semibold text-slate-700">
            {COUNTRY_LABELS[ctry] || ctry}
          </h4>
          {Object.entries(grouped[ctry]).map(([category, catEntries]) => (
            <div key={category} className="mb-4">
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {BENEFIT_CATEGORY_LABELS[category] || category}
              </h5>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Benefit Name</TableHead>
                    <TableHead>Cover Level</TableHead>
                    <TableHead>Employer Funded</TableHead>
                    <TableHead>Annual Cost</TableHead>
                    <TableHead>Happiness</TableHead>
                    <TableHead>Broker</TableHead>
                    <TableHead>Broker Happiness</TableHead>
                    <TableHead>Renewal</TableHead>
                    <TableHead>Provider</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="font-medium">{entry.benefitName}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.isCore && <Badge variant="default" className="text-xs">Core</Badge>}
                          {entry.isFlexible && <Badge variant="secondary" className="text-xs">Flex</Badge>}
                          {entry.isVoluntary && <Badge variant="secondary" className="text-xs">Voluntary</Badge>}
                          {entry.coversSpouse && <Badge variant="secondary" className="text-xs">Spouse</Badge>}
                          {entry.coversDependents && <Badge variant="secondary" className="text-xs">Dependents</Badge>}
                        </div>
                        <CategoryDetails entry={entry} />
                        {entry.notes && (
                          <div className="mt-1 text-xs text-slate-400 italic">{entry.notes}</div>
                        )}
                      </TableCell>
                      <TableCell>{entry.coverLevel}</TableCell>
                      <TableCell>{entry.employerFunded ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        {entry.annualCostPerEmployee != null
                          ? formatCurrency(entry.annualCostPerEmployee, entry.costCurrency)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {entry.benefitSatisfactionScore != null
                          ? `${entry.benefitSatisfactionScore}/10`
                          : "—"}
                      </TableCell>
                      <TableCell>{entry.brokerName || "—"}</TableCell>
                      <TableCell>
                        {entry.brokerSatisfactionScore != null
                          ? `${entry.brokerSatisfactionScore}/10`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {entry.renewalDate
                          ? new Date(entry.renewalDate).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>{entry.provider || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PlatformTab({ platforms }: { platforms: PlatformInfo[] }) {
  if (platforms.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No platform information recorded.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Uses Platform</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Fee</TableHead>
          <TableHead>Fee Model</TableHead>
          <TableHead>Satisfaction</TableHead>
          <TableHead>Total Reward</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {platforms.map((p) => (
          <TableRow key={p.id}>
            <TableCell>{p.usesPlatform ? "Yes" : "No"}</TableCell>
            <TableCell>{p.platformName || "—"}</TableCell>
            <TableCell>
              {p.platformType ? PLATFORM_TYPE_LABELS[p.platformType] || p.platformType : "—"}
            </TableCell>
            <TableCell>
              {p.annualPlatformFee != null
                ? formatCurrency(p.annualPlatformFee, p.feeCurrency)
                : "—"}
            </TableCell>
            <TableCell>
              {p.feeModel ? FEE_MODEL_LABELS[p.feeModel] || p.feeModel : "—"}
            </TableCell>
            <TableCell>
              {p.platformSatisfactionScore != null ? `${p.platformSatisfactionScore}/10` : "—"}
            </TableCell>
            <TableCell>
              {p.usesTotalRewardPlatform
                ? p.totalRewardPlatformName || "Yes"
                : "No"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ExclusionsTab({ exclusions }: { exclusions: CategoryExclusion[] }) {
  if (exclusions.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">No category exclusions.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Country</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Type</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {exclusions.map((ex) => (
          <TableRow key={ex.id}>
            <TableCell>{COUNTRY_LABELS[ex.country] || ex.country || "—"}</TableCell>
            <TableCell>
              {BENEFIT_CATEGORY_LABELS[ex.benefitCategory] || ex.benefitCategory}
            </TableCell>
            <TableCell>
              <Badge variant={ex.isCore ? "default" : "secondary"}>
                {ex.isCore ? "Core" : "Flex"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CompanyDetailPanel({ company }: { company: CompanyDetail }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts ({company.users.length})
          </TabsTrigger>
          <TabsTrigger value="benefits">
            Benefits ({company.benefitEntries.length})
          </TabsTrigger>
          <TabsTrigger value="platform">Platform</TabsTrigger>
          <TabsTrigger value="exclusions">
            Exclusions ({company.categoryExclusions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab company={company} />
        </TabsContent>

        <TabsContent value="contacts">
          <ContactsTab users={company.users} />
        </TabsContent>

        <TabsContent value="benefits">
          <BenefitsTab entries={company.benefitEntries} />
        </TabsContent>

        <TabsContent value="platform">
          <PlatformTab platforms={company.platformInfo} />
        </TabsContent>

        <TabsContent value="exclusions">
          <ExclusionsTab exclusions={company.categoryExclusions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
