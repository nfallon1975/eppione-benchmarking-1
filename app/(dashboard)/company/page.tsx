"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NACE_INDUSTRIES } from "@/lib/utils";
import { CountryPicker } from "@/components/ui/country-picker";

interface CompanyData {
  id: string;
  name: string;
  country: string;
  industry: string;
  employeeCount: number;
  averageSalary: number | null;
  averageSalaryCurrency: string | null;
  averageBonus: number | null;
  averageBonusCurrency: string | null;
  benefitBudget: number | null;
  benefitBudgetCurrency: string;
  averageWorkforceAge: number | null;
  desiredNewBenefits: string | null;
}

interface LinkedBroker {
  id: string;
  status: string;
  accessLevel: string;
  acceptedAt: string | null;
  brokerName: string | null;
  brokerFirm: string | null;
}

export default function CompanyPage() {
  const [, setCompany] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [brokers, setBrokers] = useState<LinkedBroker[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    country: "",
    industry: "",
    employeeCount: "",
    averageSalary: "",
    averageSalaryCurrency: "EUR",
    averageBonus: "",
    averageBonusCurrency: "EUR",
    benefitBudget: "",
    benefitBudgetCurrency: "EUR",
    averageWorkforceAge: "",
    desiredNewBenefits: "",
  });

  useEffect(() => {
    async function fetchCompany() {
      try {
        const res = await fetch("/api/companies");
        if (res.ok) {
          const data = await res.json();
          setCompany(data);
          setFormData({
            name: data.name || "",
            country: data.country || "",
            industry: data.industry || "",
            employeeCount: data.employeeCount?.toString() || "",
            averageSalary: data.averageSalary?.toString() || "",
            averageSalaryCurrency: data.averageSalaryCurrency || "EUR",
            averageBonus: data.averageBonus?.toString() || "",
            averageBonusCurrency: data.averageBonusCurrency || "EUR",
            benefitBudget: data.benefitBudget?.toString() || "",
            benefitBudgetCurrency: data.benefitBudgetCurrency || "EUR",
            averageWorkforceAge: data.averageWorkforceAge?.toString() || "",
            desiredNewBenefits: data.desiredNewBenefits || "",
          });
        }
      } catch (err) {
        console.error("Failed to fetch company:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCompany();
    fetchBrokers();
  }, []);

  async function fetchBrokers() {
    try {
      const res = await fetch("/api/clients/brokers");
      if (res.ok) {
        const data = await res.json();
        setBrokers(data);
      }
    } catch (err) {
      console.error("Failed to fetch brokers:", err);
    }
  }

  async function revokeBroker(relationshipId: string) {
    setRevokingId(relationshipId);
    try {
      const res = await fetch("/api/clients/brokers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relationshipId }),
      });
      if (res.ok) {
        fetchBrokers();
      }
    } catch (err) {
      console.error("Failed to revoke broker:", err);
    } finally {
      setRevokingId(null);
    }
  }

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/companies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          country: formData.country,
          industry: formData.industry,
          employeeCount: parseInt(formData.employeeCount),
          averageSalary: formData.averageSalary
            ? parseFloat(formData.averageSalary)
            : null,
          averageSalaryCurrency: formData.averageSalaryCurrency,
          averageBonus: formData.averageBonus
            ? parseFloat(formData.averageBonus)
            : null,
          averageBonusCurrency: formData.averageBonusCurrency,
          benefitBudget: formData.benefitBudget
            ? parseFloat(formData.benefitBudget)
            : null,
          benefitBudgetCurrency: formData.benefitBudgetCurrency,
          averageWorkforceAge: formData.averageWorkforceAge
            ? parseFloat(formData.averageWorkforceAge)
            : null,
          desiredNewBenefits: formData.desiredNewBenefits || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update");
        return;
      }

      setSuccess(true);
    } catch {
      setError("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Loading company profile...</div>
      </div>
    );
  }

  const currencies = ["EUR", "GBP", "USD", "AED", "SGD", "AUD"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Company Profile</h1>
        <p className="mt-1 text-slate-500">
          Manage your company information for benchmarking
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>
            This information is used to match you with relevant benchmarking
            data. It is never shared individually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
              Company profile updated successfully.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Country</Label>
                <CountryPicker
                  value={formData.country}
                  onChange={(v) => updateField("country", v)}
                />
              </div>

              <div className="space-y-2">
                <Label>Industry (NACE)</Label>
                <Select
                  value={formData.industry}
                  onValueChange={(v) => updateField("industry", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(NACE_INDUSTRIES).map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {code} - {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeCount">Number of Employees</Label>
              <Input
                id="employeeCount"
                type="number"
                min={1}
                value={formData.employeeCount}
                onChange={(e) => updateField("employeeCount", e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="avgSalary">Average Salary</Label>
                <div className="flex gap-2">
                  <Input
                    id="avgSalary"
                    type="number"
                    min={0}
                    step={100}
                    value={formData.averageSalary}
                    onChange={(e) => updateField("averageSalary", e.target.value)}
                    placeholder="e.g. 65000"
                  />
                  <Select
                    value={formData.averageSalaryCurrency}
                    onValueChange={(v) =>
                      updateField("averageSalaryCurrency", v)
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avgBonus">Average Bonus</Label>
                <div className="flex gap-2">
                  <Input
                    id="avgBonus"
                    type="number"
                    min={0}
                    step={100}
                    value={formData.averageBonus}
                    onChange={(e) => updateField("averageBonus", e.target.value)}
                    placeholder="e.g. 5000"
                  />
                  <Select
                    value={formData.averageBonusCurrency}
                    onValueChange={(v) =>
                      updateField("averageBonusCurrency", v)
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="benefitBudget">Total Benefits Budget</Label>
                <div className="flex gap-2">
                  <Input
                    id="benefitBudget"
                    type="number"
                    min={0}
                    step={1000}
                    value={formData.benefitBudget}
                    onChange={(e) => updateField("benefitBudget", e.target.value)}
                    placeholder="e.g. 500000"
                  />
                  <Select
                    value={formData.benefitBudgetCurrency}
                    onValueChange={(v) =>
                      updateField("benefitBudgetCurrency", v)
                    }
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="avgWorkforceAge">Average Workforce Age</Label>
                <Input
                  id="avgWorkforceAge"
                  type="number"
                  min={16}
                  max={100}
                  step={0.1}
                  value={formData.averageWorkforceAge}
                  onChange={(e) =>
                    updateField("averageWorkforceAge", e.target.value)
                  }
                  placeholder="e.g. 35"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desiredNewBenefits">Desired New Benefits</Label>
              <Textarea
                id="desiredNewBenefits"
                value={formData.desiredNewBenefits}
                onChange={(e) =>
                  updateField("desiredNewBenefits", e.target.value)
                }
                placeholder="What new benefits would you like to offer?"
                rows={3}
              />
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Broker Access Section */}
      {brokers.length > 0 && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Broker Access</CardTitle>
            <CardDescription>
              Brokers linked to your account can view your benchmarking data
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {brokers.some((b) => b.status === "ACTIVE") && (
              <div className="mx-6 mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                Your broker{" "}
                <strong>
                  {brokers.find((b) => b.status === "ACTIVE")?.brokerFirm || ""}
                </strong>{" "}
                has view access to your benchmarking data.
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Broker Firm</TableHead>
                  <TableHead>Access Level</TableHead>
                  <TableHead>Linked Since</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokers.map((broker) => (
                  <TableRow key={broker.id}>
                    <TableCell className="font-medium">
                      {broker.brokerFirm || broker.brokerName || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {broker.accessLevel === "VIEW_AND_ADVISE"
                          ? "View & Advise"
                          : "View Only"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {broker.acceptedAt
                        ? new Date(broker.acceptedAt).toLocaleDateString()
                        : "Pending"}
                    </TableCell>
                    <TableCell>
                      {broker.status === "ACTIVE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                          disabled={revokingId === broker.id}
                          onClick={() => revokeBroker(broker.id)}
                        >
                          {revokingId === broker.id ? "Revoking..." : "Revoke"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
