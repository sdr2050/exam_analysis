import React from "react";
import {
  Users,
  CheckCircle2,
  Award,
  TrendingUp,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";
import { ParsedGazette, CandidateRecord } from "../types/exam";
import { PerformanceBandChart } from "./charts/PerformanceBandChart";
import { OverallGradeChart } from "./charts/OverallGradeChart";

interface ExecutiveOverviewProps {
  gazette: ParsedGazette;
  onSelectCandidate: (candidate: CandidateRecord) => void;
  onFilterByBand: (bandLabel: string) => void;
  onFilterByGrade: (grade: string) => void;
  onNavigateToSubjects: () => void;
}

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  gazette,
  onSelectCandidate,
  onFilterByBand,
  onFilterByGrade,
  onNavigateToSubjects,
}) => {
  const { summary } = gazette;

  return (
    <div className="space-y-6">
      {/* 4-Card KPI Strip (Single Elevation, Tabular Numerals) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Candidates & Pass Rate */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cohort & Clearance
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-display tabular-nums">
              {summary.passPercentage}%
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({summary.passCount}/{summary.totalCandidates})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            {summary.compartmentCount > 0
              ? `${summary.compartmentCount} Compartment · `
              : ""}
            {summary.resultLaterCount > 0
              ? `${summary.resultLaterCount} Result Later (R.L.)`
              : "All results officially cleared"}
          </p>
        </div>

        {/* KPI 2: Mean Best-5 */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Mean Best-5 Score
            </span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-display tabular-nums">
              {summary.meanBest5}%
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Median: {summary.medianBest5}%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            Average across top 5 subjects of passed cohort
          </p>
        </div>

        {/* KPI 3: Highest Best-5 & Range */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              School Top Mark
            </span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-700 font-display tabular-nums">
              {summary.highestBest5}%
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Low: {summary.lowestBest5}%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            Spread of {(summary.highestBest5 - summary.lowestBest5).toFixed(1)}% between top & base
          </p>
        </div>

        {/* KPI 4: Distinctions & Honors */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Distinctions (≥75%)
            </span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 font-display tabular-nums">
              {summary.distinctionCount}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({summary.distinctionPercentage}%)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2 font-medium">
            {summary.ninetyPlusCount} candidate(s) crossed 90%+
          </p>
        </div>
      </div>

      {/* Visual Analytics Grid: Performance Bands & Overall Grades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Bands */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Performance Bands (Best-5 %)
              </h2>
              <p className="text-xs text-slate-500">
                Distribution of passed candidates across standardized academic tiers
              </p>
            </div>
            <span className="text-xs font-mono text-blue-700 font-medium">
              5 Bins
            </span>
          </div>

          <PerformanceBandChart
            bands={summary.performanceBands}
            totalPassed={summary.passCount}
            onSelectBand={onFilterByBand}
          />
        </div>

        {/* Overall Grade Distribution */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                CBSE Grade Distribution
              </h2>
              <p className="text-xs text-slate-500">
                Aggregate subject grades (A1 to E) across all exam papers evaluated
              </p>
            </div>
            <button
              onClick={onNavigateToSubjects}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 flex items-center gap-1"
            >
              Subject Details <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <OverallGradeChart
            grades={summary.overallGradeDistribution}
            onSelectGrade={onFilterByGrade}
          />
        </div>
      </div>

      {/* Automated Academic Insights & Observations */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Automated Academic Audit & Observations
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Synthesized from {gazette.summary.totalCandidates} student records
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summary.insights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
                insight.type === "positive"
                  ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-950"
                  : insight.type === "highlight"
                  ? "bg-blue-50/60 border-blue-200/80 text-blue-950"
                  : insight.type === "warning"
                  ? "bg-amber-50/60 border-amber-200/80 text-amber-950"
                  : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            >
              <div className="font-bold mb-1 flex items-center gap-1.5">
                {insight.type === "positive" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                {insight.type === "highlight" && <Sparkles className="w-3.5 h-3.5 text-blue-600" />}
                {insight.type === "warning" && <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                <span>{insight.title}</span>
              </div>
              <p className="text-slate-700 leading-normal">{insight.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 Performers Honors Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Top 5 Performers (Best-5 Rankers)
            </h2>
            <p className="text-xs text-slate-500">
              Highest scoring students ranked by Best-5 percentage and total marks
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Click any student to view scorecard
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 font-mono uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Candidate Name</th>
                <th className="py-3 px-4 text-center">Gender</th>
                <th className="py-3 px-4 text-right">Best-5 Marks</th>
                <th className="py-3 px-4 text-right">Best-5 %</th>
                <th className="py-3 px-4 text-right">All Marks</th>
                <th className="py-3 px-4 text-center">Result</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.topPerformers.map((student) => (
                <tr
                  key={student.rollNo}
                  onClick={() => onSelectCandidate(student)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs">
                      #{student.rankBest5}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 font-medium">
                    {student.rollNo}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 group-hover:text-blue-700">
                    {student.candidateName}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-600">
                    {student.gender}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-900 font-medium tabular-nums">
                    {student.best5Total} / 500
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                    {student.best5Percentage}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600 tabular-nums">
                    {student.totalMarksAll}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {student.result}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center text-blue-700 font-medium group-hover:translate-x-0.5 transition-transform">
                      View <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
