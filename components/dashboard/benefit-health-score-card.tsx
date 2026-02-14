"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CountrySelector } from "@/components/benchmarks/country-selector";
import { HealthScoreInfoPanel } from "./health-score-info-panel";
import type {
  CategoryHealthScore,
  ScoreBand,
  ScoreBreakdown,
} from "@/lib/benefit-health-score";

interface HealthScoreData {
  overall: number;
  band: ScoreBand;
  categoryScores: CategoryHealthScore[];
  breakdown: ScoreBreakdown;
  country: string;
  totalCompanies: number;
  dataAsOf: string;
}

// ---------------------------------------------------------------------------
// SVG Ring Gauge
// ---------------------------------------------------------------------------

function ScoreGauge({ score, colour }: { score: number; colour: string }) {
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <svg width={size} height={size} className="mx-auto">
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
      />
      {/* Score ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={colour}
        strokeWidth={strokeWidth}
        strokeDasharray={`${progress} ${circumference - progress}`}
        strokeDashoffset={circumference / 4} // start from top
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
      {/* Score text */}
      <text
        x={size / 2}
        y={size / 2 - 6}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-4xl font-bold"
        fill="#0f172a"
        fontSize="42"
        fontWeight="700"
      >
        {score}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 24}
        textAnchor="middle"
        dominantBaseline="central"
        className="text-sm"
        fill="#64748b"
        fontSize="13"
      >
        out of 100
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Category pill
// ---------------------------------------------------------------------------

function CategoryPill({
  label,
  score,
  isStrength,
}: {
  label: string;
  score: number;
  isStrength: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <span
        className={`text-sm font-semibold ${
          isStrength ? "text-green-600" : "text-amber-600"
        }`}
      >
        {score}/100
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BenefitHealthScoreCard() {
  const [data, setData] = useState<HealthScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  // Fetch available countries on mount
  useEffect(() => {
    async function fetchCountries() {
      try {
        const res = await fetch("/api/company/countries");
        if (res.ok) {
          const json = await res.json();
          setCountries(json.countries || []);
          if (json.countries?.length > 0 && !selectedCountry) {
            setSelectedCountry(json.countries[0]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch countries:", err);
      }
    }
    fetchCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch score whenever selected country changes
  const fetchScore = useCallback(async (country: string) => {
    if (!country) return;
    setLoading(true);
    try {
      const url = `/api/benefit-health-score?country=${encodeURIComponent(country)}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error("Failed to fetch health score:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      fetchScore(selectedCountry);
    }
  }, [selectedCountry, fetchScore]);

  const isMultiCountry = countries.length > 1;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Benefit Health Score</CardTitle>
            {isMultiCountry && (
              <CountrySelector
                value={selectedCountry}
                onChange={setSelectedCountry}
                countries={countries}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-sm text-slate-500">
            Calculating your benefit health score...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Sort for strengths (highest) and improvements (lowest, only offered categories)
  const offeredSorted = [...data.categoryScores]
    .filter((c) => c.offered)
    .sort((a, b) => b.total - a.total);

  const strongest = offeredSorted.slice(0, 3);
  const weakest = offeredSorted
    .slice()
    .reverse()
    .slice(0, 3);

  // Don't show weakest if same as strongest (very few categories)
  const showWeakest = offeredSorted.length > 3;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Benefit Health Score</CardTitle>
            <div className="flex items-center gap-3">
              {isMultiCountry && (
                <CountrySelector
                  value={selectedCountry}
                  onChange={setSelectedCountry}
                  countries={countries}
                />
              )}
              <button
                onClick={() => setShowInfo(true)}
                className="text-sm font-medium text-eppione-cyan hover:underline"
              >
                How is this calculated?
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Based on {data.totalCompanies} peer companies
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8 md:grid-cols-3">
            {/* Gauge */}
            <div className="flex flex-col items-center justify-center">
              <ScoreGauge score={data.overall} colour={data.band.colour} />
              <span
                className="mt-2 text-sm font-semibold"
                style={{ color: data.band.colour }}
              >
                {data.band.label}
              </span>
              {data.breakdown.missingCategories > 0 && (
                <div className="mt-3 text-center">
                  <p className="text-xs text-slate-500">
                    Score for offered benefits: <span className="font-semibold text-slate-700">{data.breakdown.offeredAvg}/100</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Overall score reduced by {data.breakdown.missingCategories} missing
                    {data.breakdown.missingCategories === 1 ? " category" : " categories"}
                  </p>
                </div>
              )}
            </div>

            {/* Strongest */}
            <div>
              <h4 className="mb-3 text-sm font-semibold text-slate-700">
                Strongest Categories
              </h4>
              <div className="space-y-2">
                {strongest.map((c) => (
                  <CategoryPill
                    key={c.category}
                    label={c.categoryLabel}
                    score={c.total}
                    isStrength
                  />
                ))}
              </div>
            </div>

            {/* Areas for improvement */}
            {showWeakest && (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-slate-700">
                  Areas for Improvement
                </h4>
                <div className="space-y-2">
                  {weakest.map((c) => (
                    <CategoryPill
                      key={c.category}
                      label={c.categoryLabel}
                      score={c.total}
                      isStrength={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <HealthScoreInfoPanel
        open={showInfo}
        onClose={() => setShowInfo(false)}
        categoryScores={data.categoryScores}
        breakdown={data.breakdown}
        overall={data.overall}
        band={data.band}
      />
    </>
  );
}
