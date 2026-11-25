import React from "react";
import { X, Award, Printer, TrendingUp, CheckCircle2 } from "lucide-react";
import { CandidateRecord, SubjectStat, CBSE_SUBJECT_CODES } from "../types/exam";

interface StudentScorecardDrawerProps {
  candidate: CandidateRecord | null;
  subjectStats: SubjectStat[];
  onClose: () => void;
}

export const StudentScorecardDrawer: React.FC<StudentScorecardDrawerProps> = ({
  candidate,
  subjectStats,
  onClose,
}) => {
  if (!candidate) return null;

  // Build subject lookup map for averages
  const statsMap = new Map<string, SubjectStat>();
  for (const s of subjectStats) {
    statsMap.set(s.subjectCode, s);
  }

  const handlePrintScorecard = () => {
    window.print();
  };

  const subjectEntries = Object.entries(candidate.subjects).sort((a, b) => {
    const isCoreA = ["301", "302", "001", "002"].includes(a[0]) ? 0 : 1;
    const isCoreB = ["301", "302", "001", "002"].includes(b[0]) ? 0 : 1;
    if (isCoreA !== isCoreB) return isCoreA - isCoreB;
    return a[0].localeCompare(b[0]);
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity">
      <div
        className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                ROLL: {candidate.rollNo}
              </span>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                  candidate.result === "PASS"
                    ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                    : "text-amber-700 bg-amber-50 border border-amber-200"
                }`}
              >
                {candidate.result}
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {candidate.candidateName}
            </h2>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-1">
              <span>Sex: {candidate.gender === "M" ? "Male" : "Female"}</span>
              <span aria-hidden="true">·</span>
              <span>Sch: {candidate.schoolCode}</span>
              <span aria-hidden="true">·</span>
              <span>{candidate.performanceBand}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintScorecard}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
              title="Print Scorecard"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Performance Highlights KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                School Rank
              </span>
              <span className="text-2xl font-bold text-slate-900 tabular-nums">
                {candidate.rankBest5 !== null ? `#${candidate.rankBest5}` : "—"}
              </span>
            </div>

            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                Best-5 %
              </span>
              <span className="text-2xl font-bold text-emerald-700 tabular-nums">
                {candidate.best5Percentage !== null ? `${candidate.best5Percentage}%` : "—"}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Best-5 Total
              </span>
              <span className="text-2xl font-bold text-slate-900 tabular-nums">
                {candidate.best5Total !== null ? `${candidate.best5Total}/500` : "—"}
              </span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                All Subjects
              </span>
              <span className="text-2xl font-bold text-slate-900 tabular-nums">
                {candidate.totalMarksAll !== null ? candidate.totalMarksAll : "—"}
              </span>
            </div>
          </div>

          {/* Subject-Wise Performance Table & Delta vs School Mean */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Subject Performance & School Delta
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Scale: /100
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {subjectEntries.map(([code, score]) => {
                const subName = CBSE_SUBJECT_CODES[code] || `Subject ${code}`;
                const stat = statsMap.get(code);
                const schoolMean = stat ? stat.meanMarks : null;
                const delta =
                  score.marks !== null && schoolMean !== null
                    ? Number((score.marks - schoolMean).toFixed(1))
                    : null;
                const isAboveMean = delta !== null && delta >= 0;

                return (
                  <div key={code} className="p-3.5 space-y-2 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {code}
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {subName}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 font-mono">
                        {score.marks !== null ? (
                          <>
                            <span className="text-base font-bold text-slate-900 tabular-nums">
                              {score.marks}
                            </span>
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                              {score.grade}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">
                            {score.grade || "Result Later"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* School Mean Comparison Bar */}
                    {score.marks !== null && schoolMean !== null && (
                      <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-1">
                        <div className="flex items-center gap-1.5">
                          <span>School Avg: {schoolMean}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-semibold ${
                              isAboveMean ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {delta !== null && delta >= 0 ? `+${delta}` : delta} vs Avg
                          </span>
                        </div>

                        {/* Progress bar comparison */}
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(Math.max(score.marks, 0), 100)}%` }}
                            className={`h-full rounded-full ${
                              isAboveMean ? "bg-emerald-600" : "bg-blue-600"
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Internal Assessment Grades */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Internal Assessment (Work Experience, Physical Education, General Studies)
            </span>
            <div className="flex items-center gap-4 font-mono text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">GR1 (Work Exp)</span>
                <span className="font-bold text-slate-900 text-sm">
                  {candidate.internalGrade1 || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">GR2 (Health & PE)</span>
                <span className="font-bold text-slate-900 text-sm">
                  {candidate.internalGrade2 || "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">GR3 (General Studies)</span>
                <span className="font-bold text-slate-900 text-sm">
                  {candidate.internalGrade3 || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            CBSE Secondary School Examination Record
          </span>
          <button
            onClick={handlePrintScorecard}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Student Scorecard
          </button>
        </div>
      </div>
    </div>
  );
};
