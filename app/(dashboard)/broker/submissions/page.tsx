"use client";

import { Fragment, useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CompanyDetailPanel } from "@/components/admin/company-detail-panel";
import {
  COUNTRY_LABELS,
  NACE_INDUSTRIES,
} from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Building2,
  Globe,
  BarChart3,
  Loader2,
} from "lucide-react";

interface SubmissionCompany {
  id: string;
  name: string;
  country: string;
  industry: string;
  employeeCount: number;
  employeeCountRange: string | null;
  surveyCompletedAt: string;
  users: { name: string | null; email: string }[];
  _count: { benefitEntries: number };
}

export default function BrokerSubmissionsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [companies, setCompanies] = useState<SubmissionCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Filters
  const [countryFilter, setCountryFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (session?.user?.role !== "BROKER") {
      router.push("/dashboard");
      return;
    }
    fetchSubmissions();
  }, [session, router]);

  async function fetchSubmissions() {
    try {
      const params = new URLSearchParams();
      if (countryFilter && countryFilter !== "all") params.set("country", countryFilter);
      if (industryFilter && industryFilter !== "all") params.set("industry", industryFilter);
      const qs = params.toString();
      const res = await fetch(`/api/broker/submissions${qs ? `?${qs}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setLoading(false);
    }
  }

  // Re-fetch when filters change
  useEffect(() => {
    if (session?.user?.role === "BROKER") {
      setLoading(true);
      fetchSubmissions();
    }
  }, [countryFilter, industryFilter]);

  async function toggleExpand(companyId: string) {
    if (expandedId === companyId) {
      setExpandedId(null);
      setDetailData(null);
      return;
    }

    setExpandedId(companyId);
    setDetailLoading(true);
    setDetailData(null);

    try {
      const res = await fetch(`/api/broker/submissions/${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
      }
    } catch (err) {
      console.error("Failed to fetch company detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.users.some(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            (u.name && u.name.toLowerCase().includes(q))
        )
    );
  }, [companies, searchQuery]);

  // Compute summary stats
  const totalSubmissions = companies.length;
  const countriesRepresented = new Set(companies.map((c) => c.country)).size;
  const avgEntries =
    companies.length > 0
      ? Math.round(
          companies.reduce((sum, c) => sum + c._count.benefitEntries, 0) /
            companies.length
        )
      : 0;

  // Unique countries and industries from data for filter dropdowns
  const availableCountries = Array.from(new Set(companies.map((c) => c.country))).sort();
  const availableIndustries = Array.from(new Set(companies.map((c) => c.industry))).sort();

  if (loading && companies.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Loading client submissions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Client Submissions</h1>
        <p className="mt-1 text-slate-500">
          View completed survey submissions from your clients
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Client Submissions</CardDescription>
            <CardTitle className="text-2xl">{totalSubmissions}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Building2 className="h-4 w-4" />
              Completed surveys
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Countries Represented</CardDescription>
            <CardTitle className="text-2xl">{countriesRepresented}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Globe className="h-4 w-4" />
              Unique countries
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Benefit Entries</CardDescription>
            <CardTitle className="text-2xl">{avgEntries}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <BarChart3 className="h-4 w-4" />
              Per client
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-48">
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {availableCountries.map((c) => (
                <SelectItem key={c} value={c}>
                  {COUNTRY_LABELS[c] || c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Industries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Industries</SelectItem>
              {availableIndustries.map((i) => (
                <SelectItem key={i} value={i}>
                  {NACE_INDUSTRIES[i] || i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <Input
            placeholder="Search by company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <CardDescription>
            {filtered.length} {filtered.length === 1 ? "client" : "clients"} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Entries</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-slate-500">
                    No client submissions found.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((company) => (
                <Fragment key={company.id}>
                  <TableRow
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => toggleExpand(company.id)}
                  >
                    <TableCell>
                      {expandedId === company.id ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {COUNTRY_LABELS[company.country] || company.country}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">
                      {NACE_INDUSTRIES[company.industry] || company.industry}
                    </TableCell>
                    <TableCell>{company.employeeCountRange || company.employeeCount}</TableCell>
                    <TableCell className="text-sm">
                      {company.users[0]?.email || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(company.surveyCompletedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{company._count.benefitEntries}</Badge>
                    </TableCell>
                  </TableRow>
                  {expandedId === company.id && (
                    <TableRow key={`${company.id}-detail`}>
                      <TableCell colSpan={8} className="p-4">
                        {detailLoading && (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                            <span className="ml-2 text-sm text-slate-500">Loading details...</span>
                          </div>
                        )}
                        {!detailLoading && detailData && (
                          <CompanyDetailPanel company={detailData as never} />
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
