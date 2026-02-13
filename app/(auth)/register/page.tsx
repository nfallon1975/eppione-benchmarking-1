"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Monitor } from "lucide-react";
import { NACE_INDUSTRIES } from "@/lib/utils";
import { CountryPicker, MultiCountryPicker } from "@/components/ui/country-picker";

type RegistrationRole = "CLIENT" | "BROKER";

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [role, setRole] = useState<RegistrationRole>("CLIENT");
  const [inviteBrokerName, setInviteBrokerName] = useState<string | null>(null);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
    country: "",
    industry: "",
    employeeCount: "",
    // Broker fields
    licenseNumber: "",
    countriesActive: [] as string[],
  });

  useEffect(() => {
    if (inviteToken) {
      // Force CLIENT role when invite token present
      setRole("CLIENT");
      // Fetch invite details
      fetch(`/api/broker/invite-info?token=${inviteToken}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setInviteBrokerName(data.brokerName);
            if (data.inviteEmail) {
              setFormData((prev) => ({ ...prev, email: data.inviteEmail }));
            }
          }
        })
        .catch(() => {});
    }
  }, [inviteToken]);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload: Record<string, unknown> =
        role === "BROKER"
          ? {
              role: "BROKER",
              name: formData.name,
              email: formData.email,
              password: formData.password,
              companyName: formData.companyName,
              licenseNumber: formData.licenseNumber || undefined,
              countriesActive: formData.countriesActive,
              acceptedTerms: true,
            }
          : {
              role: "CLIENT",
              name: formData.name,
              email: formData.email,
              password: formData.password,
              companyName: formData.companyName,
              country: formData.country,
              industry: formData.industry,
              employeeCount: parseInt(formData.employeeCount),
              acceptedTerms: true,
              ...(inviteToken ? { inviteToken } : {}),
            };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Registration Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Your account has been created and is pending approval by an
              Eppione administrator. You will be able to sign in once your
              account is approved.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button className="w-full">Go to Sign In</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - brand (desktop only) */}
      <div className="hidden flex-col justify-center bg-eppione-navy px-12 lg:flex lg:w-1/2">
        <Link href="/" className="inline-flex items-center gap-3">
          <Monitor className="h-10 w-10 text-eppione-cyan" />
          <span className="text-3xl font-bold text-white">Eppione</span>
        </Link>
        <p className="mt-4 text-lg text-white/80">
          Join leading companies benchmarking their employee benefits.
        </p>
        <p className="mt-2 text-sm text-white/60">
          Get started in minutes. Compare across 200+ countries and 20+ industries.
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-4 py-12">
        {/* Mobile brand header */}
        <div className="mb-8 text-center lg:hidden">
          <Link href="/" className="inline-flex items-center gap-2">
            <Monitor className="h-8 w-8 text-eppione-cyan" />
            <span className="text-2xl font-bold text-eppione-navy">Eppione</span>
          </Link>
        </div>

        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
              <CardDescription>
                {role === "BROKER"
                  ? "Register as a benefits broker"
                  : "Register to start benchmarking your benefits"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inviteBrokerName && (
                <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
                  Invited by <strong>{inviteBrokerName}</strong>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Role toggle - hidden when invite token present */}
              {!inviteToken && (
                <div className="mb-6 flex rounded-lg border p-1">
                  <button
                    type="button"
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      role === "CLIENT"
                        ? "bg-eppione-navy text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    onClick={() => setRole("CLIENT")}
                  >
                    Register as a Company
                  </button>
                  <button
                    type="button"
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      role === "BROKER"
                        ? "bg-eppione-navy text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    onClick={() => setRole("BROKER")}
                  >
                    Register as a Broker
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email">Work Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    minLength={8}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName">
                    {role === "BROKER" ? "Broker Firm Name" : "Company Name"}
                  </Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => updateField("companyName", e.target.value)}
                    required
                  />
                </div>

                {/* Client-specific fields */}
                {role === "CLIENT" && (
                  <>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <CountryPicker
                        value={formData.country}
                        onChange={(v) => updateField("country", v)}
                        placeholder="Search for your country..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Industry (NACE)</Label>
                      <Select
                        value={formData.industry}
                        onValueChange={(v) => updateField("industry", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
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
                  </>
                )}

                {/* Broker-specific fields */}
                {role === "BROKER" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="licenseNumber">License Number (Optional)</Label>
                      <Input
                        id="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={(e) => updateField("licenseNumber", e.target.value)}
                        placeholder="e.g. FCA 123456"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Countries Active</Label>
                      <p className="text-xs text-slate-500">
                        Select the countries where you advise clients
                      </p>
                      <MultiCountryPicker
                        value={formData.countriesActive}
                        onChange={(codes) =>
                          setFormData((prev) => ({ ...prev, countriesActive: codes }))
                        }
                        placeholder="Search and add countries..."
                      />
                    </div>
                  </>
                )}

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="acceptedTerms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  />
                  <label htmlFor="acceptedTerms" className="text-sm leading-tight text-slate-600">
                    I agree to the{" "}
                    <Link
                      href="/terms"
                      target="_blank"
                      className="font-medium text-eppione-cyan hover:underline"
                    >
                      Terms of Use
                    </Link>{" "}
                    and{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      className="font-medium text-eppione-cyan hover:underline"
                    >
                      Privacy Notice
                    </Link>
                  </label>
                </div>

                <Button type="submit" className="w-full" disabled={loading || !acceptedTerms}>
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="justify-center">
              <p className="text-sm text-slate-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-eppione-cyan hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
