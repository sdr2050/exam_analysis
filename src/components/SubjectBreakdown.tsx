import React, { useState } from "react";
import {
  BookOpen,
  ArrowUpDown,
  Filter,
  BarChart3,
  Layers,
} from "lucide-react";
import { ParsedGazette, SubjectStat, STANDARD_GRADES } from "../types/exam";
import { SubjectComparisonChart } from "./charts/SubjectComparisonChart";
import { SubjectStackedGradesChart } from "./charts/SubjectStackedGradesChart";

interface SubjectBreakdownProps {
  gazette: ParsedGazette;
  onFilterBySubject: (subjectCode: string) => void;
}

type SortField =
  | "subjectCode"
  | "subjectName"
  | "studentsAppeared"
  | "meanMarks"
  | "medianMarks"
  | "highestMarks"
  | "lowestMarks"
  | "passPercentage"
  | "qualityPercentage";

export const SubjectBreakdown: React.FC<SubjectBreakdownProps> = ({
  gazette,
  onFilterBySubject,
}) => {
  const [activeChart, setActiveChart] = useState<"means" | "stacked">("means");
  const [sortField, setSortField] = useState<SortField>("meanMarks");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedStats = [...gazette.subjectStats].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];
    if (typeof valA === "string") {
      const cmp = (valA as string).localeCompare(valB as string);
      return sortAsc ? cmp : -cmp;
    }
    const diff = (valA as number) - (valB as number);
    return sortAsc ? diff : -diff;
  });

  return (
    <div className="space-y-6">
      {/* Chart Section with View Toggle */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700" />
              Curriculum & Subject Performance Breakdown
            </h2>
            <p className="text-xs text-slate-500">
              Comparative analysis of {gazette.subjectStats.length} academic disciplines evaluated
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

        {activeChart === "means" ? (
          <SubjectComparisonChart
            stats={gazette.subjectStats}
            schoolAverage={gazette.summary.meanBest5}
            onSelectSubject={onFilterBySubject}
          />
        ) : (
          <SubjectStackedGradesChart stats={gazette.subjectStats} />
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
            {gazette.subjectStats.length} Subjects Evaluated
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
                  onClick={() => handleSort("meanMarks")}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Mean <ArrowUpDown className="w-3 h-3 text-slate-400" />
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
                <th className="py-3 px-3 text-right">Drill Down</th>
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
                  <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                    {s.meanMarks}
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
                    <button
                      onClick={() => onFilterBySubject(s.subjectCode)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-sans font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors whitespace-nowrap"
                      title={`Filter cohort enrolled in ${s.subjectName}`}
                    >
                      <Filter className="w-3 h-3" />
                      Filter
                    </button>
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
