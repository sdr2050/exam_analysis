import React from "react";
import { ParsedGazette, STANDARD_GRADES } from "../types/exam";

interface PrintableReportProps {
  gazette: ParsedGazette;
}

export const PrintableReport: React.FC<PrintableReportProps> = ({ gazette }) => {
  const { summary, subjectStats } = gazette;

  return (
    <div className="print-only p-4 font-sans text-slate-900 bg-white">
      {/* Institutional Letterhead Header */}
      <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-xl font-bold uppercase tracking-tight">
          CENTRAL BOARD OF SECONDARY EDUCATION
        </h1>
        <p className="text-sm font-semibold uppercase text-slate-700">
          {gazette.examTitle}
        </p>
        <p className="text-base font-bold mt-1 text-slate-900">
          {gazette.schoolName} (School Code: {gazette.schoolCode})
        </p>
        <p className="text-xs text-slate-600 font-mono mt-0.5">
          Region: {gazette.region} · Examination Date: {gazette.examDate} · Gazette: {gazette.fileName}
        </p>
      </div>

      {/* 1. Executive Performance Summary */}
      <div className="mb-6 print-avoid-break">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
          1. Executive Institutional Performance Summary
        </h2>
        <table className="w-full text-xs border border-slate-300 font-mono">
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="p-2 font-semibold bg-slate-100 w-1/4">Total Candidates Registered</td>
              <td className="p-2 font-bold w-1/4">{summary.totalCandidates}</td>
              <td className="p-2 font-semibold bg-slate-100 w-1/4">Candidates Passed</td>
              <td className="p-2 font-bold w-1/4">{summary.passCount} ({summary.passPercentage}%)</td>
            </tr>
            <tr>
              <td className="p-2 font-semibold bg-slate-100">Compartment Candidates</td>
              <td className="p-2">{summary.compartmentCount}</td>
              <td className="p-2 font-semibold bg-slate-100">Result Later (R.L.)</td>
              <td className="p-2">{summary.resultLaterCount}</td>
            </tr>
            <tr>
              <td className="p-2 font-semibold bg-slate-100">Mean Best-5 Percentage</td>
              <td className="p-2 font-bold">{summary.meanBest5}%</td>
              <td className="p-2 font-semibold bg-slate-100">Median Best-5 Percentage</td>
              <td className="p-2">{summary.medianBest5}%</td>
            </tr>
            <tr>
              <td className="p-2 font-semibold bg-slate-100">Highest Best-5 Score</td>
              <td className="p-2 font-bold text-emerald-800">{summary.highestBest5}%</td>
              <td className="p-2 font-semibold bg-slate-100">Lowest Best-5 Score</td>
              <td className="p-2">{summary.lowestBest5}%</td>
            </tr>
            <tr>
              <td className="p-2 font-semibold bg-slate-100">Distinctions (≥75% Best-5)</td>
              <td className="p-2 font-bold">{summary.distinctionCount} ({summary.distinctionPercentage}%)</td>
              <td className="p-2 font-semibold bg-slate-100">90% & Above Achievers</td>
              <td className="p-2 font-bold">{summary.ninetyPlusCount} students</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. Performance Band Distribution */}
      <div className="mb-6 print-avoid-break">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
          2. Academic Performance Bands (Best-5 %)
        </h2>
        <table className="w-full text-xs border border-slate-300 font-mono text-left">
          <thead className="bg-slate-100 border-b border-slate-300">
            <tr>
              <th className="p-2">Academic Performance Band</th>
              <th className="p-2 text-right">Student Count (N)</th>
              <th className="p-2 text-right">Share of Passed Cohort (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {summary.performanceBands.map((band) => (
              <tr key={band.label}>
                <td className="p-2 font-semibold">{band.label}</td>
                <td className="p-2 text-right font-bold">{band.count}</td>
                <td className="p-2 text-right">{band.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 3. Subject-wise Analysis Table */}
      <div className="mb-6 print-avoid-break">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
          3. Subject-Wise Examination Analysis & Grade Distribution
        </h2>
        <table className="w-full text-[10px] border border-slate-300 font-mono text-left">
          <thead className="bg-slate-100 border-b border-slate-300 uppercase">
            <tr>
              <th className="p-1.5">Code</th>
              <th className="p-1.5">Subject Name</th>
              <th className="p-1.5 text-right">App.</th>
              <th className="p-1.5 text-right">Mean</th>
              <th className="p-1.5 text-right">Med.</th>
              <th className="p-1.5 text-right">Max</th>
              <th className="p-1.5 text-right">Min</th>
              <th className="p-1.5 text-right">Pass %</th>
              <th className="p-1.5 text-right">A1+A2 %</th>
              {STANDARD_GRADES.map((g) => (
                <th key={g} className="p-1 text-center">{g}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {subjectStats.map((s) => (
              <tr key={s.subjectCode}>
                <td className="p-1.5 font-bold">{s.subjectCode}</td>
                <td className="p-1.5 font-sans font-medium">{s.subjectName}</td>
                <td className="p-1.5 text-right">{s.studentsAppeared}</td>
                <td className="p-1.5 text-right font-bold">{s.meanMarks}</td>
                <td className="p-1.5 text-right">{s.medianMarks}</td>
                <td className="p-1.5 text-right">{s.highestMarks}</td>
                <td className="p-1.5 text-right">{s.lowestMarks}</td>
                <td className="p-1.5 text-right font-semibold">{s.passPercentage}%</td>
                <td className="p-1.5 text-right font-semibold">{s.qualityPercentage}%</td>
                {STANDARD_GRADES.map((g) => (
                  <td key={g} className="p-1 text-center">
                    {s.gradeCounts[g] || 0}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Top Rankers Register */}
      <div className="print-avoid-break">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
          4. Top Merit Rankers (Top 5 Performers)
        </h2>
        <table className="w-full text-xs border border-slate-300 font-mono text-left">
          <thead className="bg-slate-100 border-b border-slate-300">
            <tr>
              <th className="p-2">Rank</th>
              <th className="p-2">Roll No</th>
              <th className="p-2">Candidate Name</th>
              <th className="p-2 text-center">Sex</th>
              <th className="p-2 text-right">Best-5 / 500</th>
              <th className="p-2 text-right">Best-5 %</th>
              <th className="p-2 text-right">All Total</th>
              <th className="p-2 text-center">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {summary.topPerformers.map((student) => (
              <tr key={student.rollNo}>
                <td className="p-2 font-bold">#{student.rankBest5}</td>
                <td className="p-2">{student.rollNo}</td>
                <td className="p-2 font-sans font-semibold">{student.candidateName}</td>
                <td className="p-2 text-center">{student.gender}</td>
                <td className="p-2 text-right font-bold">{student.best5Total}</td>
                <td className="p-2 text-right font-bold">{student.best5Percentage}%</td>
                <td className="p-2 text-right">{student.totalMarksAll}</td>
                <td className="p-2 text-center font-bold">{student.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Signature Strip */}
      <div className="mt-12 pt-6 border-t border-slate-400 flex items-center justify-between text-xs font-mono text-slate-600 print-avoid-break">
        <div>
          <p className="border-t border-slate-400 pt-1 w-48 text-center">Examination In-charge</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-400">Generated via Gazette Lens</p>
          <p>{new Date().toLocaleDateString()}</p>
        </div>
        <div>
          <p className="border-t border-slate-400 pt-1 w-48 text-center">Principal / Head of Institution</p>
        </div>
      </div>
    </div>
  );
};
