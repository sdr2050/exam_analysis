import React from "react";

interface GradeDistributionItem {
  grade: string;
  count: number;
  percentage: number;
}

interface OverallGradeChartProps {
  grades: GradeDistributionItem[];
  onSelectGrade?: (grade: string) => void;
}

const GRADE_COLORS: Record<string, string> = {
  A1: "bg-emerald-600 text-white",
  A2: "bg-emerald-500 text-white",
  B1: "bg-blue-600 text-white",
  B2: "bg-blue-500 text-white",
  C1: "bg-amber-600 text-white",
  C2: "bg-amber-500 text-white",
  D1: "bg-orange-600 text-white",
  D2: "bg-orange-500 text-white",
  E: "bg-rose-600 text-white",
};

export const OverallGradeChart: React.FC<OverallGradeChartProps> = ({
  grades,
  onSelectGrade,
}) => {
  const maxCount = Math.max(...grades.map((g) => g.count), 1);
  const totalAwarded = grades.reduce((acc, g) => acc + g.count, 0);

  return (
    <div className="space-y-4">
      {/* Visual Histogram Columns */}
      <div className="h-44 flex items-end justify-between gap-1.5 sm:gap-2 pt-6 px-1 border-b border-slate-200">
        {grades.map((item) => {
          const heightPct = (item.count / maxCount) * 100;
          const colorClass = GRADE_COLORS[item.grade] || "bg-slate-600 text-white";

          return (
            <div
              key={item.grade}
              onClick={() => onSelectGrade?.(item.grade)}
              className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
            >
              {/* Tooltip on hover / value above bar */}
              <span className="text-[10px] font-mono font-semibold text-slate-700 opacity-90 group-hover:opacity-100 mb-1 tabular-nums transition-transform group-hover:-translate-y-0.5">
                {item.count}
              </span>

              {/* Bar */}
              <div className="w-full max-w-[40px] bg-slate-100 rounded-t-md overflow-hidden flex flex-col justify-end h-full">
                <div
                  style={{ height: `${Math.max(heightPct, item.count > 0 ? 6 : 0)}%` }}
                  className={`w-full rounded-t-md transition-all duration-500 ${colorClass.split(" ")[0]} group-hover:brightness-90`}
                />
              </div>

              {/* X-Axis Label */}
              <span className="text-xs font-bold font-mono mt-2 text-slate-700 group-hover:text-blue-700">
                {item.grade}
              </span>
            </div>
          );
        })}
      </div>

      {/* Grade Summary Legend Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-mono pt-1">
        <span>Total Grades Awarded: {totalAwarded}</span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-emerald-600" /> A1/A2 Quality
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-blue-600" /> B1/B2 Good
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-amber-600" /> C1/C2 Average
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-xs bg-orange-600" /> D1/D2 Pass
          </span>
        </div>
      </div>
    </div>
  );
};
