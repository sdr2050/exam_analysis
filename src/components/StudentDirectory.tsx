import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  Download,
  Users,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { ParsedGazette, CandidateRecord, CBSE_SUBJECT_CODES } from "../types/exam";
import { exportFilteredStudentsCSV } from "../utils/csvExporter";

interface StudentDirectoryProps {
  gazette: ParsedGazette;
  onSelectCandidate: (candidate: CandidateRecord) => void;
}

type DirectorySort = "rank" | "roll" | "name" | "best5Pct" | "totalMarks";

export const StudentDirectory: React.FC<StudentDirectoryProps> = ({
  gazette,
  onSelectCandidate,
}) => {
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("ALL");
  const [sortField, setSortField] = useState<DirectorySort>("rank");
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field: DirectorySort) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "name" || field === "roll" || field === "rank");
    }
  };

  const filtered = useMemo(() => {
    return gazette.candidates.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!c.rollNo.includes(q) && !c.candidateName.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (resultFilter !== "ALL" && c.result !== resultFilter) {
        return false;
      }
      return true;
    });
  }, [gazette.candidates, search, resultFilter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let diff = 0;
      if (sortField === "rank") {
        const rankA = a.rankBest5 ?? 99999;
        const rankB = b.rankBest5 ?? 99999;
        diff = rankA - rankB;
      } else if (sortField === "roll") {
        diff = a.rollNo.localeCompare(b.rollNo);
      } else if (sortField === "name") {
        diff = a.candidateName.localeCompare(b.candidateName);
      } else if (sortField === "best5Pct") {
        diff = (a.best5Percentage ?? 0) - (b.best5Percentage ?? 0);
      } else if (sortField === "totalMarks") {
        diff = (a.totalMarksAll ?? 0) - (b.totalMarksAll ?? 0);
      }
      return sortAsc ? diff : -diff;
    });
  }, [filtered, sortField, sortAsc]);

  const resultsList = Array.from(new Set(gazette.candidates.map((c) => c.result || "Unknown")));

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate name or roll number..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-600 outline-hidden font-mono"
            />
          </div>

          {/* Quick Result Filter Tabs */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
            <button
              onClick={() => setResultFilter("ALL")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                resultFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({gazette.candidates.length})
            </button>
            {resultsList.map((res) => {
              const count = gazette.candidates.filter((c) => c.result === res).length;
              return (
                <button
                  key={res}
                  onClick={() => setResultFilter(res)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    resultFilter === res
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {res} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Export Filtered List Action */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">
            Showing {sorted.length} students
          </span>
          <button
            onClick={() => exportFilteredStudentsCSV(sorted, `${gazette.fileName}_candidates_list.csv`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Download CSV
          </button>
        </div>
      </div>

      {/* Complete Student Register Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 font-mono text-[11px] uppercase">
              <tr>
                <th
                  onClick={() => handleSort("rank")}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors w-16"
                >
                  <div className="flex items-center gap-1">
                    Rank <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("roll")}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors w-24"
                >
                  <div className="flex items-center gap-1">
                    Roll No <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("name")}
                  className="py-3 px-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    Candidate Name <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-2 text-center w-10">Sex</th>
                <th className="py-3 px-2 text-center w-16">Result</th>
                <th
                  onClick={() => handleSort("best5Pct")}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    Best-5 % <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 text-right">Best-5 / 500</th>
                <th
                  onClick={() => handleSort("totalMarks")}
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    All Total <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Dynamic Subject Marks Columns */}
                {gazette.sortedSubjectCodes.map((code) => (
                  <th key={code} className="py-3 px-2 text-center font-mono text-[10px]" title={CBSE_SUBJECT_CODES[code]}>
                    {code}
                  </th>
                ))}

                <th className="py-3 px-3 text-right">Scorecard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((c) => (
                <tr
                  key={c.rollNo}
                  onClick={() => onSelectCandidate(c)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <td className="py-2.5 px-3 font-mono text-slate-900 font-bold">
                    {c.rankBest5 !== null ? (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px]">
                        {c.rankBest5}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-600">
                    {c.rollNo}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 group-hover:text-blue-700 whitespace-nowrap">
                    {c.candidateName}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-600">
                    {c.gender}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        c.result === "PASS"
                          ? "text-emerald-700 bg-emerald-50"
                          : "text-amber-700 bg-amber-50"
                      }`}
                    >
                      {c.result}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                    {c.best5Percentage !== null ? `${c.best5Percentage}%` : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                    {c.best5Total !== null ? c.best5Total : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                    {c.totalMarksAll !== null ? c.totalMarksAll : "—"}
                  </td>

                  {/* Individual Subject Scores */}
                  {gazette.sortedSubjectCodes.map((code) => {
                    const sub = c.subjects[code];
                    if (!sub || sub.marks === null) {
                      return (
                        <td key={code} className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-300">
                          {sub?.grade || "—"}
                        </td>
                      );
                    }
                    const isHigh = sub.grade === "A1" || sub.grade === "A2";
                    return (
                      <td key={code} className="py-2.5 px-2 text-center font-mono text-[11px] tabular-nums">
                        <span className={isHigh ? "font-bold text-emerald-700" : "text-slate-800"}>
                          {sub.marks}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-0.5">{sub.grade}</span>
                      </td>
                    );
                  })}

                  <td className="py-2.5 px-3 text-right">
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
