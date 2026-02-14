"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type {
  CategoryHealthScore,
  ScoreBand,
  ScoreBreakdown,
} from "@/lib/benefit-health-score";
import { SCORE_BANDS } from "@/lib/benefit-health-score";

interface HealthScoreInfoPanelProps {
  open: boolean;
  onClose: () => void;
  categoryScores: CategoryHealthScore[];
  breakdown: ScoreBreakdown;
  overall: number;
  band: ScoreBand;
}

export function HealthScoreInfoPanel({
  open,
  onClose,
  categoryScores,
  breakdown,
  overall,
  band,
}: HealthScoreInfoPanelProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How Your Benefit Health Score Works</DialogTitle>
          <DialogDescription>
            Your score is calculated by comparing your benefit offering against
            peer companies in your country and industry.
          </DialogDescription>
        </DialogHeader>

        {/* Methodology */}
        <div className="space-y-6">
          {/* Dimensions table */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              Scoring Dimensions
            </h3>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-3 py-2 text-left font-medium text-slate-700">
                      Dimension
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-slate-700">
                      Max Pts
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-slate-700">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-3 py-2 font-medium">Coverage</td>
                    <td className="px-3 py-2 text-center">25</td>
                    <td className="px-3 py-2 text-slate-600">
                      Points for offering the benefit category
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-3 py-2 font-medium">
                      Cost Efficiency
                    </td>
                    <td className="px-3 py-2 text-center">25</td>
                    <td className="px-3 py-2 text-slate-600">
                      Measures value for money — achieving strong plan richness
                      at lower cost scores highest. Adjusted for workforce
                      demographics when data is available.
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-3 py-2 font-medium">Plan Richness</td>
                    <td className="px-3 py-2 text-center">30</td>
                    <td className="px-3 py-2 text-slate-600">
                      Category-specific comparison (e.g. excess, cover
                      multiples, contribution %) against benchmark medians
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium">Breadth</td>
                    <td className="px-3 py-2 text-center">20</td>
                    <td className="px-3 py-2 text-slate-600">
                      Employer funded, spouse cover, dependent cover, core
                      benefit status
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Per-category breakdown */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              Your Category Breakdown
            </h3>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="px-3 py-2 text-left font-medium text-slate-700">
                      Category
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-slate-700">
                      Coverage
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-slate-700">
                      Cost
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-slate-700">
                      Richness
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-slate-700">
                      Breadth
                    </th>
                    <th className="px-3 py-2 text-center font-medium text-slate-700">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categoryScores.map((cs) => (
                    <tr key={cs.category} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        <span className="font-medium">{cs.categoryLabel}</span>
                        {!cs.offered && (
                          <span className="ml-1 text-xs text-slate-400">
                            (not offered)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">{cs.coverage}</td>
                      <td className="px-3 py-2 text-center">{cs.cost}</td>
                      <td className="px-3 py-2 text-center">
                        {cs.planRichness}
                      </td>
                      <td className="px-3 py-2 text-center">{cs.breadth}</td>
                      <td className="px-3 py-2 text-center font-semibold">
                        {cs.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overall breakdown */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              Overall Score
            </h3>
            <div className="space-y-1 rounded-md border p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">
                  Weighted average (by market prevalence)
                </span>
                <span className="font-medium">{breakdown.weightedAvg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">
                  Bonus (offering {breakdown.totalCategoriesOffered} categories
                  vs market avg of {breakdown.marketAvgCategoriesOffered})
                </span>
                <span className="font-medium">+{breakdown.bonusPoints}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="font-semibold text-slate-900">
                  Final Score
                </span>
                <span className="font-bold" style={{ color: band.colour }}>
                  {overall}
                </span>
              </div>
            </div>
          </div>

          {/* Score bands legend */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-900">
              Score Bands
            </h3>
            <div className="space-y-1">
              {SCORE_BANDS.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center gap-3 rounded px-2 py-1 text-sm"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: b.colour }}
                  />
                  <span className="w-28 font-medium">{b.label}</span>
                  <span className="text-slate-500">
                    {b.min}–{b.max}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
