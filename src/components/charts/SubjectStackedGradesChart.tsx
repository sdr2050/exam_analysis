import React from "react";
import { SubjectStat, STANDARD_GRADES } from "../../types/exam";

interface SubjectStackedGradesChartProps {
  stats: SubjectStat[];
}

const GRADE_PALETTE: Record<string, string> = {
  A1: "bg-emerald-600",
  A2: "bg-emerald-500",
  B1: "bg-blue-600",
  B2: "bg-blue-500",
  C1: "bg-amber-500",
  C2: "bg-amber-600",
  D1: "bg-orange-500",
  D2: "bg-orange-600",
  E: "bg-rose-600",
};

export const SubjectStackedGradesChart: React.FC<SubjectStackedGradesChartProps> = ({
  stats,
}) => {
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-600 pb-2 border-b border-slate-100">
        <span className="font-semibold text-slate-700">Grade Scales:</span>
        {STANDARD_GRADES.map((g) => (
          <span key={g} className="inline-flex items-center gap-1">
            <span className={`w-2.5 h-2.5 rounded-xs ${GRADE_PALETTE[g]}`} />
            {g}
          </span>
        ))}
      </div>

      <div className="space-y-4">
        {stats.map((s) => {
          const total = s.studentsAppeared || 1;

          return (
            <div key={s.subjectCode} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="font-mono text-slate-500 bg-slate-100 px-1 rounded text-[11px]">
                    {s.subjectCode}
                  </span>
                  {s.subjectName}
                </span>
                <span className="font-mono text-slate-500 text-[11px]">
                  Pass: {s.passPercentage}% · Quality (A1+A2): {s.qualityPercentage}%
                </span>
              </div>

              {/* 100% Stacked Bar */}
              <div className="w-full bg-slate-100 h-5 rounded-md overflow-hidden flex shadow-xs">
                {STANDARD_GRADES.map((g) => {
                  const count = s.gradeCounts[g] || 0;
                  if (count === 0) return null;
                  const pct = (count / total) * 100;

                  return (
                    <div
                      key={g}
                      style={{ width: `${pct}%` }}
                      className={`h-full ${GRADE_PALETTE[g]} flex items-center justify-center text-[10px] text-white font-mono font-bold transition-all hover:brightness-110`}
                      title={`${s.subjectName} (${s.subjectCode}) - Grade ${g}: ${count} student(s) (${pct.toFixed(1)}%)`}
                    >
                      {pct >= 6 ? g : ""}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
