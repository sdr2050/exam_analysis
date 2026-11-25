import React from "react";
import { PerformanceBandCount } from "../../types/exam";

interface PerformanceBandChartProps {
  bands: PerformanceBandCount[];
  totalPassed: number;
  onSelectBand?: (bandLabel: string) => void;
}

export const PerformanceBandChart: React.FC<PerformanceBandChartProps> = ({
  bands,
  totalPassed,
  onSelectBand,
}) => {
  const maxCount = Math.max(...bands.map((b) => b.count), 1);

  return (
    <div className="space-y-3.5">
      {bands.map((band) => {
        const pctOfMax = (band.count / maxCount) * 100;
        return (
          <div
            key={band.label}
            onClick={() => onSelectBand?.(band.label)}
            className={`group rounded-lg p-2.5 transition-all ${
              onSelectBand ? "cursor-pointer hover:bg-slate-100" : ""
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-800 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${band.badgeBg}`} />
                {band.label}
              </span>
              <div className="flex items-center gap-2 font-mono text-slate-600">
                <span className="font-bold text-slate-900 tabular-nums">{band.count}</span>
                <span className="text-slate-400">({band.percentage}%)</span>
              </div>
            </div>

            {/* Bar Container */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${Math.max(pctOfMax, band.count > 0 ? 3 : 0)}%` }}
                className={`h-full rounded-full transition-all duration-500 ${band.badgeBg} group-hover:brightness-95`}
              />
            </div>
          </div>
        );
      })}

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>Passed Cohort Base: {totalPassed} students</span>
        {onSelectBand && <span>Click any band to filter cohort</span>}
      </div>
    </div>
  );
};
