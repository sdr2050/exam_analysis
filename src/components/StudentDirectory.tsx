import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  ArrowUpDown,
  Download,
  ChevronRight,
  Check,
  BookOpen,
  RotateCcw,
} from "lucide-react";
import {
  ParsedGazette,
  CandidateRecord,
  CBSE_SUBJECT_CODES,
  STANDARD_GRADES,
} from "../types/exam";
import { exportFilteredStudentsCSV } from "../utils/csvExporter";

interface StudentDirectoryProps {
  gazette: ParsedGazette;
  onSelectCandidate: (candidate: CandidateRecord) => void;
  initialSubjectCode?: string;
  initialStatuses?: string[];
}

type DirectorySort = "rank" | "roll" | "name" | "best5Pct" | "totalMarks" | "subjectMarks";

export const StudentDirectory: React.FC<StudentDirectoryProps> = ({
  gazette,
  onSelectCandidate,
  initialSubjectCode,
  initialStatuses,
}) => {
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(initialStatuses || []);
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubjectCode || "ALL");
  const [selectedGrade, setSelectedGrade] = useState<string>("ALL");
  const [selectedSection, setSelectedSection] = useState<string>("ALL");
  const [sortField, setSortField] = useState<DirectorySort>(
    initialSubjectCode && initialSubjectCode !== "ALL" ? "subjectMarks" : "rank"
  );
  const [sortAsc, setSortAsc] = useState(
    !(initialSubjectCode && initialSubjectCode !== "ALL")
  );

  useEffect(() => {
    if (initialSubjectCode !== undefined) {
      setSelectedSubject(initialSubjectCode || "ALL");
      if (initialSubjectCode && initialSubjectCode !== "ALL") {
        setSortField("subjectMarks");
        setSortAsc(false);
      }
    }
  }, [initialSubjectCode]);

  useEffect(() => {
    if (initialStatuses !== undefined) {
      setSelectedStatuses(initialStatuses);
    }
  }, [initialStatuses]);

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

  const handleSubjectChange = (code: string) => {
    setSelectedSubject(code);
    if (code === "ALL" && sortField === "subjectMarks") {
      setSortField("rank");
      setSortAsc(true);
    }
  };

  const availableSections = useMemo(() => {
    if (gazette.sections.length === 0) return [];
    const present = Array.from(
      new Set(gazette.candidates.map((c) => c.section || "Unassigned"))
    );
    return present.sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [gazette.candidates, gazette.sections]);

  const resetFilters = () => {
    setSearch("");
    setSelectedStatuses([]);
    setSelectedSubject("ALL");
    setSelectedGrade("ALL");
    setSelectedSection("ALL");
    setSortField("rank");
    setSortAsc(true);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedStatuses.length > 0 ||
    selectedSubject !== "ALL" ||
    selectedGrade !== "ALL" ||
    selectedSection !== "ALL";

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
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(c.result || "Unknown")) {
        return false;
      }
      if (selectedSection !== "ALL" && (c.section || "Unassigned") !== selectedSection) {
        return false;
      }
      if (selectedSubject !== "ALL") {
        const sub = c.subjects[selectedSubject];
        if (!sub) return false;
        if (selectedGrade !== "ALL" && sub.grade !== selectedGrade) {
          return false;
        }
      } else if (selectedGrade !== "ALL") {
        const hasGrade = Object.values(c.subjects).some((s) => s.grade === selectedGrade);
        if (!hasGrade) return false;
      }
      return true;
    });
  }, [gazette.candidates, search, selectedStatuses, selectedSection, selectedSubject, selectedGrade]);

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
        diff = (a.best5Percentage ?? -1) - (b.best5Percentage ?? -1);
      } else if (sortField === "totalMarks") {
        diff = (a.totalMarksAll ?? -1) - (b.totalMarksAll ?? -1);
      } else if (sortField === "subjectMarks" && selectedSubject !== "ALL") {
        const mA = a.subjects[selectedSubject]?.marks ?? -1;
        const mB = b.subjects[selectedSubject]?.marks ?? -1;
        diff = mA - mB;
      }
      return sortAsc ? diff : -diff;
    });
  }, [filtered, sortField, sortAsc, selectedSubject]);

  const activeSubjectSummary = useMemo(() => {
    if (selectedSubject === "ALL") return null;
    const marks: number[] = [];
    let passCount = 0;
    let qualityCount = 0;
    for (const c of filtered) {
      const sub = c.subjects[selectedSubject];
      if (!sub || sub.marks === null) continue;
      marks.push(sub.marks);
      if (sub.grade !== "E") passCount++;
      if (sub.grade === "A1" || sub.grade === "A2") qualityCount++;
    }
    const sortedMarks = [...marks].sort((a, b) => a - b);
    const mid = Math.floor(sortedMarks.length / 2);
    const median =
      sortedMarks.length === 0
        ? null
        : sortedMarks.length % 2 !== 0
          ? sortedMarks[mid]
          : Number(((sortedMarks[mid - 1] + sortedMarks[mid]) / 2).toFixed(1));
    const mean =
      marks.length > 0
        ? Number((marks.reduce((a, b) => a + b, 0) / marks.length).toFixed(2))
        : null;
    return {
      subjectCode: selectedSubject,
      subjectName: CBSE_SUBJECT_CODES[selectedSubject] || `Subject ${selectedSubject}`,
      enrolled: filtered.length,
      scored: marks.length,
      mean,
      median,
      highest: marks.length > 0 ? Math.max(...marks) : null,
      lowest: marks.length > 0 ? Math.min(...marks) : null,
      passRate: marks.length > 0 ? Number(((passCount / marks.length) * 100).toFixed(1)) : null,
      qualityRate:
        marks.length > 0 ? Number(((qualityCount / marks.length) * 100).toFixed(1)) : null,
    };
  }, [filtered, selectedSubject]);

  const visibleSubjectCodes =
    selectedSubject === "ALL"
      ? gazette.sortedSubjectCodes
      : gazette.sortedSubjectCodes.filter((c) => c !== selectedSubject);

  const exportFileName =
    selectedSubject !== "ALL"
      ? `${gazette.fileName}_subject_${selectedSubject}_candidates.csv`
      : `${gazette.fileName}_candidates_list.csv`;

  return (
    <div className="space-y-4">
      {/* Search & Multi-Criteria Filter Header Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative min-w-[230px] flex-1 sm:flex-none">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or roll number..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-600 outline-hidden font-mono"
              />
            </div>

            {/* Subject-Wise Filter */}
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <select
                value={selectedSubject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                aria-label="Filter by Subject"
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-600 outline-hidden font-medium text-slate-800"
              >
                <option value="ALL">All Subjects (Full Register)</option>
                {gazette.sortedSubjectCodes.map((code) => {
                  const stat = gazette.subjectStats.find((s) => s.subjectCode === code);
                  const label = CBSE_SUBJECT_CODES[code] || `Subject ${code}`;
                  return (
                    <option key={code} value={code}>
                      {code} — {label} {stat ? `(${stat.studentsAppeared})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Subject Grade Filter */}
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              aria-label="Filter by Grade"
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-600 outline-hidden font-mono text-slate-700"
            >
              <option value="ALL">
                {selectedSubject === "ALL" ? "Any Grade" : "All Subject Grades"}
              </option>
              {STANDARD_GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
              <option value="AB">AB (Absent)</option>
              <option value="R.L.">R.L. (Pending)</option>
            </select>

            {/* Section Filter */}
            {availableSections.length > 0 && (
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                aria-label="Filter by Section"
                className="px-2.5 py-1.5 text-xs bg-emerald-50/60 border border-emerald-200 rounded-md focus:bg-white focus:border-emerald-600 outline-hidden font-mono text-emerald-900"
              >
                <option value="ALL">All Sections</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec === "Unassigned" ? "Unassigned" : `Section ${sec}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Count, Reset & Export */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-mono">
              Showing <strong className="text-slate-800">{sorted.length}</strong> /{" "}
              {gazette.candidates.length}
            </span>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                title="Clear all active filters"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
            <button
              onClick={() => exportFilteredStudentsCSV(sorted, exportFileName)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Download CSV
            </button>
          </div>
        </div>

        {/* Multi-Select Student Result Status Filter Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
            Student Status (multi-select):
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
                    ? "bg-blue-50 text-blue-800 border-blue-400 shadow-2xs"
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
      </div>

      {/* Active Subject Cohort Summary Strip */}
      {activeSubjectSummary && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200">
              {activeSubjectSummary.subjectCode}
            </span>
            <span className="font-bold text-slate-900">{activeSubjectSummary.subjectName}</span>
            <span className="text-slate-500">
              — Subject-wise filtered cohort ({activeSubjectSummary.enrolled} enrolled,{" "}
              {activeSubjectSummary.scored} scored)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 font-mono text-slate-700">
            <span>
              Mean:{" "}
              <strong className="text-slate-900">
                {activeSubjectSummary.mean !== null ? activeSubjectSummary.mean : "—"}
              </strong>
            </span>
            <span>
              Median:{" "}
              <strong className="text-slate-900">
                {activeSubjectSummary.median !== null ? activeSubjectSummary.median : "—"}
              </strong>
            </span>
            <span>
              Max / Min:{" "}
              <strong className="text-emerald-700">
                {activeSubjectSummary.highest !== null ? activeSubjectSummary.highest : "—"}
              </strong>
              {" / "}
              <strong className="text-rose-700">
                {activeSubjectSummary.lowest !== null ? activeSubjectSummary.lowest : "—"}
              </strong>
            </span>
            <span>
              Pass:{" "}
              <strong className="text-blue-800">
                {activeSubjectSummary.passRate !== null ? `${activeSubjectSummary.passRate}%` : "—"}
              </strong>
            </span>
            <span>
              A1+A2:{" "}
              <strong className="text-emerald-700">
                {activeSubjectSummary.qualityRate !== null
                  ? `${activeSubjectSummary.qualityRate}%`
                  : "—"}
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Complete Student Register Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <p className="text-sm font-semibold text-slate-800 mb-1">
              No students match the selected subject and status filters
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Try selecting additional student statuses or switching to All Subjects.
            </p>
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
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
                  {availableSections.length > 0 && (
                    <th className="py-3 px-2 text-center w-16">Section</th>
                  )}
                  <th className="py-3 px-2 text-center w-10">Sex</th>
                  <th className="py-3 px-2 text-center w-16">Result</th>

                  {/* Highlighted Selected Subject Column */}
                  {selectedSubject !== "ALL" && (
                    <th
                      onClick={() => handleSort("subjectMarks")}
                      className="py-3 px-3 text-center cursor-pointer bg-blue-50 text-blue-900 hover:bg-blue-100 transition-colors border-x border-blue-200 whitespace-nowrap"
                      title={CBSE_SUBJECT_CODES[selectedSubject] || selectedSubject}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {selectedSubject} Marks <ArrowUpDown className="w-3 h-3 text-blue-600" />
                      </div>
                    </th>
                  )}

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

                  {/* Remaining Dynamic Subject Marks Columns */}
                  {visibleSubjectCodes.map((code) => (
                    <th
                      key={code}
                      className="py-3 px-2 text-center font-mono text-[10px]"
                      title={CBSE_SUBJECT_CODES[code]}
                    >
                      {code}
                    </th>
                  ))}

                  <th className="py-3 px-3 text-right">Scorecard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((c) => {
                  const focusedSub =
                    selectedSubject !== "ALL" ? c.subjects[selectedSubject] : undefined;
                  return (
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
                      {availableSections.length > 0 && (
                        <td className="py-2.5 px-2 text-center font-mono font-semibold text-emerald-800">
                          {c.section || "Unassigned"}
                        </td>
                      )}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-600">
                        {c.gender}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span
                          className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            c.result === "PASS"
                              ? "text-emerald-700 bg-emerald-50"
                              : c.result === "COMP"
                                ? "text-rose-700 bg-rose-50"
                                : "text-amber-700 bg-amber-50"
                          }`}
                        >
                          {c.result}
                        </span>
                      </td>

                      {/* Highlighted Selected Subject Score */}
                      {selectedSubject !== "ALL" && (
                        <td className="py-2.5 px-3 text-center font-mono bg-blue-50/40 border-x border-blue-100 tabular-nums whitespace-nowrap">
                          {focusedSub && focusedSub.marks !== null ? (
                            <>
                              <span
                                className={`font-bold ${
                                  focusedSub.grade === "A1" || focusedSub.grade === "A2"
                                    ? "text-emerald-700"
                                    : focusedSub.grade === "E"
                                      ? "text-rose-700"
                                      : "text-blue-900"
                                }`}
                              >
                                {focusedSub.marks}
                              </span>
                              <span className="text-[10px] text-slate-500 ml-1 font-semibold">
                                {focusedSub.grade}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400">{focusedSub?.grade || "—"}</span>
                          )}
                        </td>
                      )}

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
                      {visibleSubjectCodes.map((code) => {
                        const sub = c.subjects[code];
                        if (!sub || sub.marks === null) {
                          return (
                            <td
                              key={code}
                              className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-300"
                            >
                              {sub?.grade || "—"}
                            </td>
                          );
                        }
                        const isHigh = sub.grade === "A1" || sub.grade === "A2";
                        return (
                          <td
                            key={code}
                            className="py-2.5 px-2 text-center font-mono text-[11px] tabular-nums"
                          >
                            <span
                              className={
                                isHigh
                                  ? "font-bold text-emerald-700"
                                  : sub.grade === "E"
                                    ? "font-bold text-rose-700"
                                    : "text-slate-800"
                              }
                            >
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
