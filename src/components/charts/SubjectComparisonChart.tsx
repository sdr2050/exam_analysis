import React from "react";
import { SubjectStat } from "../../types/exam";

interface SubjectComparisonChartProps {
  stats: SubjectStat[];
  schoolAverage: number;
  onSelectSubject?: (subjectCode: string) => void;
}

export const SubjectComparisonChart: React.FC<SubjectComparisonChartProps> = ({
  stats,
  schoolAverage,
  onSelectSubject,
}) => {
  return (
    <div className="space-y-4">
      {/* Benchmark Indicator */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-mono pb-2 border-b border-slate-100">
        <span>Subject Performance (0–100 Scale)</span>
        <span className="flex items-center gap-1.5 font-semibold text-blue-700">
          <span className="w-2.5 h-0.5 bg-blue-700 inline-block" />
          School Mean: {schoolAverage}%
        </span>
      </div>

      <div className="space-y-3">
        {stats.map((s) => {
          const isAboveAvg = s.meanMarks >= schoolAverage;
          const diff = Number((s.meanMarks - schoolAverage).toFixed(1));

          return (
            <div
              key={s.subjectCode}
              onClick={() => onSelectSubject?.(s.subjectCode)}
              className={`p-3 rounded-lg border border-slate-200/80 bg-white transition-all ${
                onSelectSubject ? "cursor-pointer hover:border-slate-300 hover:shadow-xs" : ""
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {s.subjectCode}
                  </span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {s.subjectName}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    ({s.studentsAppeared} students)
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-500">
                    Range: <span className="text-slate-800">{s.lowestMarks}–{s.highestMarks}</span>
                  </span>
                  <span className="text-slate-500">
                    Median: <span className="text-slate-800">{s.medianMarks}</span>
                  </span>
                  <span className="font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    Mean: {s.meanMarks}
                  </span>
                  <span
                    className={`font-semibold ${
                      isAboveAvg ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {diff >= 0 ? `+${diff}` : diff}
                  </span>
                </div>
              </div>

              {/* Relative Progress Bar */}
              <div className="relative w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                {/* School Average Reference Line */}
                <div
                  style={{ left: `${Math.min(Math.max(schoolAverage, 0), 100)}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-blue-700 z-10"
                  title={`School Average Benchmark: ${schoolAverage}%`}
                />

                {/* Score Fill */}
                <div
                  style={{ width: `${Math.min(Math.max(s.meanMarks, 0), 100)}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    isAboveAvg ? "bg-emerald-600" : "bg-blue-600"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
