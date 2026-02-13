"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { COUNTRY_LABELS } from "@/lib/utils";
import { CountryPicker } from "@/components/ui/country-picker";
import type { BenchmarkResult } from "@/lib/benchmarking-types";
import { BenchmarkDetailedTab } from "@/components/benchmarks/benchmark-detailed-tab";
import { BenchmarkOverviewTab } from "@/components/benchmarks/benchmark-overview-tab";

interface ClientInfo {
  id: string;
  company: {
    name: string;
    country: string;
    countries?: string[];
  } | null;
  allowedCountries: string[];
}

export default function BrokerClientBenchmarkPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;

  const [benchmarks, setBenchmarks] = useState<BenchmarkResult | null>(null);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role !== "BROKER") {
      router.push("/dashboard");
      return;
    }

    // Get client info from broker's client list
    fetch("/api/broker/clients")
      .then((res) => (res.ok ? res.json() : []))
      .then((clients) => {
        const match = clients.find(
          (c: { companyId: string }) => c.companyId === companyId
        );
        if (match?.company) {
          const allowed: string[] = match.countries || [];
          setClientInfo({
            id: companyId,
            company: match.company,
            allowedCountries: allowed,
          });
          // Default to first allowed country, or the company's primary country
          if (allowed.length > 0) {
            setCountry(allowed[0]);
          } else {
            setCountry(match.company.country);
          }
        }
      })
      .catch(() => {});
  }, [session, router, companyId]);

  useEffect(() => {
    if (!country) return;
    setLoading(true);
    fetch(
      `/api/broker/clients/${companyId}/benchmarks?country=${country}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setBenchmarks(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId, country]);

  const countries = clientInfo?.allowedCountries?.length
    ? clientInfo.allowedCountries
    : clientInfo?.company?.country
    ? [clientInfo.company.country]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/broker/clients")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {clientInfo?.company?.name || "Client Benchmarks"}
            </h1>
            <Badge variant="secondary">View Only</Badge>
          </div>
        </div>
        <div className="w-56">
          <CountryPicker
            value={country}
            onChange={setCountry}
            limitTo={clientInfo?.allowedCountries?.length ? clientInfo.allowedCountries : undefined}
            placeholder="Select country..."
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-slate-500">Loading benchmarks...</div>
        </div>
      ) : !benchmarks ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">
            No benchmark data available for this client.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Comparison</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <BenchmarkOverviewTab data={benchmarks} countries={countries} />
          </TabsContent>
          <TabsContent value="detailed">
            <BenchmarkDetailedTab data={benchmarks} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
