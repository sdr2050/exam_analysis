import React, { useState, useMemo } from "react";
import {
  Users,
  CheckCircle2,
  Award,
  TrendingUp,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  BookOpen,
  Download,
  BarChart3,
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
  onViewSubjectStudents: (subjectCode: string, statuses: string[]) => void;
  onExportSubjectToppers: () => void;
}

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  gazette,
  onSelectCandidate,
  onFilterByBand,
  onFilterByGrade,
  onNavigateToSubjects,
  onViewSubjectStudents,
  onExportSubjectToppers,
}) => {
  const { summary, subjectStats } = gazette;
  const [qiSortMode, setQiSortMode] = useState<"qi" | "code">("qi");
  const [topperSortMode, setTopperSortMode] = useState<"code" | "qi">("code");

  const sortedQualitySubjects = useMemo(() => {
    const list = [...subjectStats];
    if (qiSortMode === "qi") {
      list.sort((a, b) => b.qualityIndex - a.qualityIndex);
    }
    return list;
  }, [subjectStats, qiSortMode]);

  const sortedTopperSubjects = useMemo(() => {
    const list = [...subjectStats];
    if (topperSortMode === "qi") {
      list.sort((a, b) => b.qualityIndex - a.qualityIndex);
    }
    return list;
  }, [subjectStats, topperSortMode]);

  const overallQualitySummary = useMemo(() => {
    const totalSum = subjectStats.reduce((acc, s) => acc + s.totalMarksSum, 0);
    const totalAppeared = subjectStats.reduce((acc, s) => acc + s.studentsAppeared, 0);
    const compositeQi = totalAppeared > 0 ? Number((totalSum / totalAppeared).toFixed(2)) : 0;
    return { totalSum, totalAppeared, compositeQi };
  }, [subjectStats]);

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
              className="text-xs font-medium text-blue-700 hover:text-blue-800 flex items-center gap-1 whitespace-nowrap shrink-0"
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

      {/* Subject Quality Index (Sum of Marks / Appeared Students) */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-700" />
              Subject Quality Index
            </h2>
            <p className="text-xs text-slate-500">
              Sum of Marks ÷ Number of Appeared Students across all candidates with numeric scores
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              Composite QI:{" "}
              <strong className="text-slate-900">{overallQualitySummary.compositeQi.toFixed(2)}</strong>
              <span className="text-slate-400">
                {" "}
                ({overallQualitySummary.totalSum.toLocaleString()} / {overallQualitySummary.totalAppeared})
              </span>
            </span>

            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setQiSortMode("qi")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  qiSortMode === "qi"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Highest QI
              </button>
              <button
                type="button"
                onClick={() => setQiSortMode("code")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  qiSortMode === "code"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Subject Order
              </button>
            </div>
          </div>
        </div>

        {sortedQualitySubjects.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No numeric subject scores available in this gazette.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 font-mono text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-4 w-20">Code</th>
                  <th className="py-2.5 px-4">Subject</th>
                  <th className="py-2.5 px-4 text-right">Sum of Marks</th>
                  <th className="py-2.5 px-4 text-right">Appeared</th>
                  <th className="py-2.5 px-4 min-w-[200px]">Quality Index (Sum ÷ Appeared)</th>
                  <th className="py-2.5 px-4 text-right">Top Mark</th>
                  <th className="py-2.5 px-4 text-right">Pass %</th>
                  <th className="py-2.5 px-4 text-right">Register</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedQualitySubjects.map((sub) => {
                  const barPct = Math.max(0, Math.min(100, sub.qualityIndex));
                  const isStrong = sub.qualityIndex >= overallQualitySummary.compositeQi;
                  return (
                    <tr
                      key={sub.subjectCode}
                      onClick={() => onViewSubjectStudents(sub.subjectCode, [])}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {sub.subjectCode}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 group-hover:text-blue-700 whitespace-nowrap">
                        {sub.subjectName}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                        {sub.totalMarksSum.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                        {sub.studentsAppeared}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[90px]">
                            <div
                              className={`h-full rounded-full ${
                                isStrong ? "bg-emerald-600" : "bg-blue-600"
                              }`}
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                          <span
                            className={`font-mono font-bold tabular-nums w-12 text-right ${
                              isStrong ? "text-emerald-700" : "text-blue-700"
                            }`}
                          >
                            {sub.qualityIndex.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                        {sub.highestMarks}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700 tabular-nums">
                        {sub.passPercentage}%
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="inline-flex items-center text-blue-700 font-medium group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
                          Students <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top 5 Students from Each Subject (Responsive Card Grid) */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700" />
              Top 5 Students by Subject
            </h2>
            <p className="text-xs text-slate-500">
              Ranked across all appeared students with numeric marks · Click any student row to inspect their scorecard
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-0.5 bg-slate-200/70 rounded-lg">
              <button
                type="button"
                onClick={() => setTopperSortMode("code")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  topperSortMode === "code"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Subject Order
              </button>
              <button
                type="button"
                onClick={() => setTopperSortMode("qi")}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  topperSortMode === "qi"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Highest QI
              </button>
            </div>

            <button
              type="button"
              onClick={onExportSubjectToppers}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Download Top 5 CSV
            </button>
          </div>
        </div>

        {sortedTopperSubjects.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-xs text-slate-500">
            No subject topper records available.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedTopperSubjects.map((sub) => (
              <div
                key={sub.subjectCode}
                className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden flex flex-col"
              >
                {/* Subject Card Header (Zero-Pill Metadata) */}
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {sub.subjectName}
                    </h3>
                    <div className="text-[11px] font-mono text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5 tabular-nums">
                      <span className="font-semibold text-slate-700">{sub.subjectCode}</span>
                      <span aria-hidden="true">·</span>
                      <span>{sub.studentsAppeared} appeared</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-blue-700 font-semibold">
                        QI {sub.qualityIndex.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onViewSubjectStudents(sub.subjectCode, [])}
                    className="text-[11px] font-medium text-blue-700 hover:text-blue-900 inline-flex items-center gap-0.5 whitespace-nowrap shrink-0 mt-0.5"
                    title={`View all students in ${sub.subjectName}`}
                  >
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Top 5 Ranked Table */}
                <div className="divide-y divide-slate-100 flex-1">
                  {sub.topStudents.map((topper) => (
                    <button
                      key={`${sub.subjectCode}-${topper.candidate.rollNo}`}
                      type="button"
                      onClick={() => onSelectCandidate(topper.candidate)}
                      className="w-full px-4 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`font-mono text-xs font-bold tabular-nums w-6 shrink-0 ${
                            topper.rank === 1 ? "text-amber-700" : "text-slate-400"
                          }`}
                        >
                          #{topper.rank}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 truncate">
                            {topper.candidate.candidateName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                            {topper.candidate.rollNo}
                            {topper.candidate.section
                              ? ` · Sec ${topper.candidate.section}`
                              : ""}
                            {topper.candidate.result !== "PASS"
                              ? ` · ${topper.candidate.result}`
                              : ""}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                        <span
                          className={`text-xs font-bold ${
                            topper.grade === "A1" || topper.grade === "A2"
                              ? "text-emerald-700"
                              : "text-slate-900"
                          }`}
                        >
                          {topper.marks}
                        </span>
                        <span className="text-[11px] text-slate-500 w-5 text-right">
                          {topper.grade || "—"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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

      {/* Top 5 Performers Honors Table (Overall Best-5) */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Top 5 Overall Performers (Best-5 Rankers)
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
                {gazette.sections.length > 0 && (
                  <th className="py-3 px-4 text-center">Section</th>
                )}
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
                  {gazette.sections.length > 0 && (
                    <td className="py-3 px-4 text-center font-mono font-semibold text-emerald-800">
                      {student.section || "Unassigned"}
                    </td>
                  )}
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
