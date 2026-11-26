import React, { useState, useMemo } from "react";
import {
  BookOpen,
  ArrowUpDown,
  Filter,
  BarChart3,
  Layers,
  Check,
  Users,
} from "lucide-react";
import {
  ParsedGazette,
  SubjectStat,
  STANDARD_GRADES,
  CBSE_SUBJECT_CODES,
} from "../types/exam";
import { SubjectComparisonChart } from "./charts/SubjectComparisonChart";
import { SubjectStackedGradesChart } from "./charts/SubjectStackedGradesChart";

interface SubjectBreakdownProps {
  gazette: ParsedGazette;
  onFilterBySubject: (subjectCode: string, statuses?: string[]) => void;
  onViewSubjectStudents: (subjectCode: string, statuses: string[]) => void;
}

type SortField =
  | "subjectCode"
  | "subjectName"
  | "studentsAppeared"
  | "totalMarksSum"
  | "qualityIndex"
  | "meanMarks"
  | "medianMarks"
  | "highestMarks"
  | "lowestMarks"
  | "passPercentage"
  | "qualityPercentage";

export const SubjectBreakdown: React.FC<SubjectBreakdownProps> = ({
  gazette,
  onFilterBySubject,
  onViewSubjectStudents,
}) => {
  const [activeChart, setActiveChart] = useState<"means" | "stacked">("means");
  const [sortField, setSortField] = useState<SortField>("qualityIndex");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  const resultsList = useMemo(
    () =>
      Array.from(new Set(gazette.candidates.map((c) => c.result || "Unknown"))).sort((a, b) => {
        if (a === "PASS") return -1;
        if (b === "PASS") return 1;
        return a.localeCompare(b);
      }),
    [gazette.candidates]
  );

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) => {
      const next = prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status];
      return next.length === resultsList.length ? [] : next;
    });
  };

  const { activeStats, activeMeanBest5, activeCohortCount } = useMemo(() => {
    if (selectedStatuses.length === 0) {
      return {
        activeStats: gazette.subjectStats,
        activeMeanBest5: gazette.summary.meanBest5,
        activeCohortCount: gazette.candidates.length,
      };
    }

    const filteredCandidates = gazette.candidates.filter((c) =>
      selectedStatuses.includes(c.result || "Unknown")
    );

    const b5Scores = filteredCandidates
      .map((c) => c.best5Percentage)
      .filter((p): p is number => p !== null && !isNaN(p));
    const meanBest5 =
      b5Scores.length > 0
        ? Number((b5Scores.reduce((a, b) => a + b, 0) / b5Scores.length).toFixed(2))
        : 0;

    const stats: SubjectStat[] = [];
    for (const code of gazette.sortedSubjectCodes) {
      const marks: number[] = [];
      const grades: string[] = [];

      for (const c of filteredCandidates) {
        const sub = c.subjects[code];
        if (sub && sub.marks !== null) {
          marks.push(sub.marks);
          grades.push(sub.grade);
        }
      }

      if (marks.length === 0) continue;

      const sum = marks.reduce((a, b) => a + b, 0);
      const qualityIndex = Number((sum / marks.length).toFixed(2));
      const mean = qualityIndex;
      const sortedMarks = [...marks].sort((a, b) => a - b);
      const mid = Math.floor(sortedMarks.length / 2);
      const median =
        sortedMarks.length % 2 !== 0
          ? sortedMarks[mid]
          : Number(((sortedMarks[mid - 1] + sortedMarks[mid]) / 2).toFixed(1));

      const highest = Math.max(...marks);
      const lowest = Math.min(...marks);
      const passCount = grades.filter((g) => g !== "E").length;
      const passPercentage = Number(((passCount / marks.length) * 100).toFixed(2));

      const gradeCounts: Record<string, number> = {};
      for (const gr of STANDARD_GRADES) {
        gradeCounts[gr] = grades.filter((g) => g === gr).length;
      }

      const qualityCount = (gradeCounts["A1"] || 0) + (gradeCounts["A2"] || 0);
      const qualityPercentage = Number(((qualityCount / marks.length) * 100).toFixed(2));

      stats.push({
        subjectCode: code,
        subjectName: CBSE_SUBJECT_CODES[code] || `Subject ${code}`,
        studentsAppeared: marks.length,
        totalMarksSum: sum,
        qualityIndex,
        meanMarks: mean,
        medianMarks: median,
        highestMarks: highest,
        lowestMarks: lowest,
        passCount,
        passPercentage,
        gradeCounts,
        qualityCount,
        qualityPercentage,
        topStudents: [],
      });
    }

    return {
      activeStats: stats,
      activeMeanBest5: meanBest5,
      activeCohortCount: filteredCandidates.length,
    };
  }, [gazette, selectedStatuses]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedStats = [...activeStats].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    if (typeof valA === "string") {
      const cmp = (valA as string).localeCompare(valB as string);
      return sortAsc ? cmp : -cmp;
    }
    const diff = (valA as number) - (valB as number);
    return sortAsc ? diff : -diff;
  });

  return (
    <div className="space-y-6">
      {/* Multi-Select Student Status Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mr-1">
            Filter by Student Status (multi-select):
          </span>
          <button
            type="button"
            onClick={() => setSelectedStatuses([])}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
              selectedStatuses.length === 0
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {selectedStatuses.length === 0 && <Check className="w-3 h-3" />}
            All ({gazette.candidates.length})
          </button>
          {resultsList.map((res) => {
            const count = gazette.candidates.filter((c) => (c.result || "Unknown") === res).length;
            const isActive = selectedStatuses.includes(res);
            return (
              <button
                key={res}
                type="button"
                onClick={() => toggleStatus(res)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-md border transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-800 border-blue-400"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-xs border ${
                    isActive
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isActive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </span>
                <span>
                  {res} ({count})
                </span>
              </button>
            );
          })}
        </div>
        <span className="text-xs font-mono text-slate-500">
          Evaluating <strong className="text-slate-800">{activeCohortCount}</strong> candidates
        </span>
      </div>

      {/* Chart Section with View Toggle */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700" />
              Curriculum & Subject Performance Breakdown
            </h2>
            <p className="text-xs text-slate-500">
              Comparative analysis of {activeStats.length} academic disciplines evaluated
              {selectedStatuses.length > 0 ? ` (${selectedStatuses.join(" + ")})` : ""}
            </p>
          </div>

          {/* Interactive Chart Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
            <button
              onClick={() => setActiveChart("means")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeChart === "means"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Mean vs Benchmark
            </button>
            <button
              onClick={() => setActiveChart("stacked")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeChart === "stacked"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Grade Stack (A1–E)
            </button>
          </div>
        </div>

        {activeStats.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No numeric subject marks are available for the selected student status filter (e.g. R.L. candidates have pending scores).
          </div>
        ) : activeChart === "means" ? (
          <SubjectComparisonChart
            stats={activeStats}
            schoolAverage={activeMeanBest5}
            onSelectSubject={(code) => onViewSubjectStudents(code, selectedStatuses)}
          />
        ) : (
          <SubjectStackedGradesChart stats={activeStats} />
        )}
      </div>

      {/* Complete Subject Performance Matrix (Matches Python build_subject_analysis) */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Subject Statistical Summary Table
            </h2>
            <p className="text-xs text-slate-500">
              Matches CBSE Gazette Analysis CSV specifications (Click headers to sort)
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {activeStats.length} Subjects Evaluated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 font-mono text-[11px]">
              <tr>
                <th
                  onClick={() => handleSort("subjectCode")}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Code <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("subjectName")}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Subject Name <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("studentsAppeared")}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Appeared <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("totalMarksSum")}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  title="Sum of all marks scored by appeared students"
                >
                  <div className="flex items-center justify-end gap-1">
                    Sum <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("qualityIndex")}
                  className="py-3 px-3 text-right cursor-pointer bg-blue-50/70 text-blue-900 hover:bg-blue-100/70 transition-colors"
                  title="Quality Index = Sum of Marks / Number of Appeared Students"
                >
                  <div className="flex items-center justify-end gap-1">
                    Quality Index <ArrowUpDown className="w-3 h-3 text-blue-600" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("medianMarks")}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Median <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("highestMarks")}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Max <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("lowestMarks")}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Min <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("passPercentage")}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Pass % <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("qualityPercentage")}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    A1+A2 % <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                {STANDARD_GRADES.map((g) => (
                  <th key={g} className="py-3 px-2 text-center font-mono text-[10px]">
                    {g}
                  </th>
                ))}
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {sortedStats.map((s) => (
                <tr key={s.subjectCode} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-900">{s.subjectCode}</td>
                  <td className="py-3 px-3 font-sans font-semibold text-slate-900 whitespace-nowrap">
                    {s.subjectName}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700 tabular-nums font-sans">
                    {s.studentsAppeared}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700 tabular-nums">
                    {s.totalMarksSum.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-blue-900 bg-blue-50/40 tabular-nums">
                    {s.qualityIndex.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700 tabular-nums">
                    {s.medianMarks}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-700 font-semibold tabular-nums">
                    {s.highestMarks}
                  </td>
                  <td className="py-3 px-3 text-right text-rose-700 tabular-nums">
                    {s.lowestMarks}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-blue-700 tabular-nums">
                    {s.passPercentage}%
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-700 tabular-nums">
                    {s.qualityPercentage}%
                  </td>
                  {STANDARD_GRADES.map((g) => (
                    <td
                      key={g}
                      className={`py-3 px-2 text-center text-xs tabular-nums ${
                        (s.gradeCounts[g] || 0) > 0 ? "font-bold text-slate-900" : "text-slate-300"
                      }`}
                    >
                      {s.gradeCounts[g] || 0}
                    </td>
                  ))}
                  <td className="py-3 px-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => onViewSubjectStudents(s.subjectCode, selectedStatuses)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-sans font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors whitespace-nowrap"
                        title={`View all students' results in ${s.subjectName}`}
                      >
                        <Users className="w-3 h-3" />
                        Students
                      </button>
                      <button
                        onClick={() => onFilterBySubject(s.subjectCode, selectedStatuses)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-sans font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors whitespace-nowrap"
                        title={`Open ${s.subjectName} in Custom Analysis`}
                      >
                        <Filter className="w-3 h-3" />
                        Pivot
                      </button>
                    </div>
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
