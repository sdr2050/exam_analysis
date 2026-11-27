import React, { useState, useMemo } from "react";
import {
  SlidersHorizontal,
  Download,
  RotateCcw,
  Search,
  Users,
  TrendingUp,
  Table,
  ChevronRight,
  Filter,
  Check,
} from "lucide-react";
import {
  ParsedGazette,
  CandidateRecord,
  CustomFilterState,
  PivotRowDimension,
  PivotColDimension,
  PivotMetric,
  PivotDistinctionFilter,
  STANDARD_GRADES,
  CBSE_SUBJECT_CODES,
} from "../types/exam";
import { buildPivotMatrix } from "../utils/pivotEngine";
import { exportFilteredStudentsCSV, exportPivotCSV } from "../utils/csvExporter";

interface CustomAnalysisWorkbenchProps {
  gazette: ParsedGazette;
  onSelectCandidate: (candidate: CandidateRecord) => void;
  initialBand?: string;
  initialSubject?: string;
  initialGrade?: string;
  initialStatuses?: string[];
}

const DEFAULT_FILTERS: CustomFilterState = {
  searchQuery: "",
  results: [],
  gender: "ALL",
  performanceBand: "ALL",
  subjectCode: "ALL",
  subjectGrade: "ALL",
  minMarks: "",
  maxMarks: "",
  minBest5: "",
  maxBest5: "",
  internalGrade1: "ALL",
};

export const CustomAnalysisWorkbench: React.FC<CustomAnalysisWorkbenchProps> = ({
  gazette,
  onSelectCandidate,
  initialBand,
  initialSubject,
  initialGrade,
  initialStatuses,
}) => {
  const [filters, setFilters] = useState<CustomFilterState>({
    ...DEFAULT_FILTERS,
    results: initialStatuses || [],
    performanceBand: initialBand || "ALL",
    subjectCode: initialSubject || "ALL",
    subjectGrade: initialGrade || "ALL",
  });

  // Pivot configuration state
  const [rowDimension, setRowDimension] = useState<PivotRowDimension>("subject");
  const [colDimension, setColDimension] = useState<PivotColDimension>("grade");
  const [metric, setMetric] = useState<PivotMetric>("count");
  const [distinctionFilter, setDistinctionFilter] = useState<PivotDistinctionFilter>("all");
  const [activeTab, setActiveTab] = useState<"pivot" | "cohort">("pivot");

  // Filter candidates dynamically based on filters
  const filteredCandidates = useMemo(() => {
    return gazette.candidates.filter((cand) => {
      // Search query (Roll No or Name)
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matchRoll = cand.rollNo.includes(q);
        const matchName = cand.candidateName.toLowerCase().includes(q);
        if (!matchRoll && !matchName) return false;
      }

      // Result status (multi-select; empty means ALL)
      if (filters.results.length > 0 && !filters.results.includes(cand.result || "Unknown")) {
        return false;
      }

      // Gender
      if (filters.gender !== "ALL" && cand.gender !== filters.gender) {
        return false;
      }

      // Performance Band
      if (filters.performanceBand !== "ALL" && cand.performanceBand !== filters.performanceBand) {
        return false;
      }

      // Subject Enrolled
      if (filters.subjectCode !== "ALL") {
        const sub = cand.subjects[filters.subjectCode];
        if (!sub) return false;

        // Subject Grade
        if (filters.subjectGrade !== "ALL" && sub.grade !== filters.subjectGrade) {
          return false;
        }

        // Subject Marks min/max
        if (filters.minMarks !== "") {
          const min = parseFloat(filters.minMarks);
          if (sub.marks === null || sub.marks < min) return false;
        }
        if (filters.maxMarks !== "") {
          const max = parseFloat(filters.maxMarks);
          if (sub.marks === null || sub.marks > max) return false;
        }
      } else {
        // If no specific subject chosen, check subjectGrade across any subject
        if (filters.subjectGrade !== "ALL") {
          const hasGrade = Object.values(cand.subjects).some(
            (s) => s.grade === filters.subjectGrade
          );
          if (!hasGrade) return false;
        }
      }

      // Best-5 % Range
      if (filters.minBest5 !== "") {
        const min = parseFloat(filters.minBest5);
        if (cand.best5Percentage === null || cand.best5Percentage < min) return false;
      }
      if (filters.maxBest5 !== "") {
        const max = parseFloat(filters.maxBest5);
        if (cand.best5Percentage === null || cand.best5Percentage > max) return false;
      }

      // Internal Grade 1
      if (filters.internalGrade1 !== "ALL" && cand.internalGrade1 !== filters.internalGrade1) {
        return false;
      }

      return true;
    });
  }, [gazette.candidates, filters]);

  // Compute Cohort Summary
  const cohortStats = useMemo(() => {
    const total = filteredCandidates.length;
    const passed = filteredCandidates.filter((c) => c.result === "PASS");
    const pcts = passed
      .map((c) => c.best5Percentage)
      .filter((p): p is number => p !== null && !isNaN(p));

    const mean =
      pcts.length > 0 ? Number((pcts.reduce((a, b) => a + b, 0) / pcts.length).toFixed(2)) : 0;
    const sorted = [...pcts].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length > 0
        ? sorted.length % 2 !== 0
          ? sorted[mid]
          : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1))
        : 0;

    const passRate = total > 0 ? Number(((passed.length / total) * 100).toFixed(1)) : 0;

    return { total, passCount: passed.length, passRate, mean, median };
  }, [filteredCandidates]);

  // Compute Pivot Matrix
  const pivotMatrix = useMemo(() => {
    return buildPivotMatrix(
      filteredCandidates,
      gazette.subjectStats,
      rowDimension,
      colDimension,
      metric,
      distinctionFilter
    );
  }, [filteredCandidates, gazette.subjectStats, rowDimension, colDimension, metric, distinctionFilter]);

  // Max value in matrix for heatmap intensity shading
  const maxCellValue = useMemo(() => {
    let max = 0;
    for (const r of pivotMatrix.rows) {
      for (const ch of pivotMatrix.colHeaders) {
        const val = r.values[ch]?.value;
        if (typeof val === "number" && val > max) max = val;
      }
    }
    return max || 1;
  }, [pivotMatrix]);

  // Preset handlers
  const applyPreset = (presetName: string) => {
    setDistinctionFilter("all");
    switch (presetName) {
      case "distinction":
        setFilters({ ...DEFAULT_FILTERS, minBest5: "75" });
        setRowDimension("subject");
        setColDimension("grade");
        setMetric("count");
        setDistinctionFilter("distinction");
        break;
      case "at_risk":
        setFilters({ ...DEFAULT_FILTERS, maxBest5: "55" });
        setRowDimension("subject");
        setColDimension("grade");
        setMetric("count");
        break;
      case "high_achievers":
        setFilters({ ...DEFAULT_FILTERS, subjectGrade: "A1" });
        setRowDimension("subject");
        setColDimension("none");
        setMetric("qualityRate");
        break;
      case "gender_comparison":
        setFilters(DEFAULT_FILTERS);
        setRowDimension("gender");
        setColDimension("performanceBand");
        setMetric("count");
        break;
      case "subject_grades":
        setFilters(DEFAULT_FILTERS);
        setRowDimension("subject");
        setColDimension("grade");
        setMetric("count");
        break;
      case "non_pass": {
        const nonPassStatuses = Object.keys(gazette.summary.resultBreakdown).filter(
          (r) => r !== "PASS"
        );
        setFilters({ ...DEFAULT_FILTERS, results: nonPassStatuses });
        setRowDimension("result");
        setColDimension("gender");
        setMetric("count");
        break;
      }
      default:
        setFilters(DEFAULT_FILTERS);
    }
  };

  const allResultStatuses = useMemo(
    () =>
      Object.keys(gazette.summary.resultBreakdown).sort((a, b) => {
        if (a === "PASS") return -1;
        if (b === "PASS") return 1;
        return a.localeCompare(b);
      }),
    [gazette.summary.resultBreakdown]
  );

  const toggleResultStatus = (status: string) => {
    setFilters((prev) => {
      const next = prev.results.includes(status)
        ? prev.results.filter((s) => s !== status)
        : [...prev.results, status];
      return {
        ...prev,
        results: next.length === allResultStatuses.length ? [] : next,
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Analytical Presets Strip */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-700" />
            Quick Follow-Up Analysis Presets
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            One-click questions for this gazette
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => applyPreset("distinction")}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-colors whitespace-nowrap"
          >
            Distinction Cohort (≥75%)
          </button>
          <button
            onClick={() => applyPreset("at_risk")}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-colors whitespace-nowrap"
          >
            Borderline Attention (&lt;55%)
          </button>
          <button
            onClick={() => applyPreset("high_achievers")}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-colors whitespace-nowrap"
          >
            A1/A2 Quality Breakdown
          </button>
          <button
            onClick={() => applyPreset("gender_comparison")}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-colors whitespace-nowrap"
          >
            Gender vs Performance Bands
          </button>
          <button
            onClick={() => applyPreset("subject_grades")}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-colors whitespace-nowrap"
          >
            Subject × Grade Matrix
          </button>
          <button
            onClick={() => applyPreset("non_pass")}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-colors whitespace-nowrap"
          >
            COMP / R.L. Non-Pass Audit
          </button>
          <button
            onClick={() => {
              setFilters(DEFAULT_FILTERS);
              setDistinctionFilter("all");
            }}
            className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md transition-colors flex items-center gap-1 ml-auto"
            title="Clear all active filters"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      {/* Composable Multi-Criteria Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Cohort Filter Workbench
          </span>
          <span className="text-xs font-mono text-slate-500">
            {filteredCandidates.length} of {gazette.summary.totalCandidates} Candidates Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search Query */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Search Candidate / Roll No
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                placeholder="Name or 8-digit roll..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-600 outline-hidden font-mono"
              />
            </div>
          </div>

          {/* Multi-Select Result Status */}
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Student Result Status (select one or multiple)
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilters({ ...filters, results: [] })}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                  filters.results.length === 0
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {filters.results.length === 0 && <Check className="w-3 h-3" />}
                All ({gazette.summary.totalCandidates})
              </button>
              {allResultStatuses.map((r) => {
                const isSelected = filters.results.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleResultStatus(r)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-md border transition-colors ${
                      isSelected
                        ? "bg-blue-50 text-blue-800 border-blue-400"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-xs border ${
                        isSelected
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    {r} ({gazette.summary.resultBreakdown[r]})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Gender
            </label>
            <select
              value={filters.gender}
              onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-600 outline-hidden font-mono"
            >
              <option value="ALL">All Genders</option>
              <option value="M">Male (M)</option>
              <option value="F">Female (F)</option>
            </select>
          </div>

          {/* Performance Band */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Performance Band
            </label>
            <select
              value={filters.performanceBand}
              onChange={(e) => setFilters({ ...filters, performanceBand: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-600 outline-hidden"
            >
              <option value="ALL">All Bands</option>
              {gazette.summary.performanceBands.map((b) => (
                <option key={b.label} value={b.label}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          {/* Enrolled Subject */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Enrolled Subject
            </label>
            <select
              value={filters.subjectCode}
              onChange={(e) => setFilters({ ...filters, subjectCode: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-600 outline-hidden"
            >
              <option value="ALL">All Subjects</option>
              {gazette.subjectStats.map((s) => (
                <option key={s.subjectCode} value={s.subjectCode}>
                  {s.subjectCode} - {s.subjectName}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Grade */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Grade Awarded
            </label>
            <select
              value={filters.subjectGrade}
              onChange={(e) => setFilters({ ...filters, subjectGrade: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-600 outline-hidden font-mono"
            >
              <option value="ALL">All Grades</option>
              {STANDARD_GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>

          {/* Min Best-5 % */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Min Best-5 %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.minBest5}
              onChange={(e) => setFilters({ ...filters, minBest5: e.target.value })}
              placeholder="e.g. 75"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-600 outline-hidden font-mono"
            />
          </div>

          {/* Max Best-5 % */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Max Best-5 %
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.maxBest5}
              onChange={(e) => setFilters({ ...filters, maxBest5: e.target.value })}
              placeholder="e.g. 90"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-600 outline-hidden font-mono"
            />
          </div>

          {/* Min Subject Marks */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Min Subject Mark
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.minMarks}
              onChange={(e) => setFilters({ ...filters, minMarks: e.target.value })}
              placeholder="e.g. 80"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-600 outline-hidden font-mono"
            />
          </div>

          {/* Max Subject Marks */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Max Subject Mark
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.maxMarks}
              onChange={(e) => setFilters({ ...filters, maxMarks: e.target.value })}
              placeholder="e.g. 100"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-600 outline-hidden font-mono"
            />
          </div>

          {/* Internal Grade 1 */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Internal Grade (GR1)
            </label>
            <select
              value={filters.internalGrade1}
              onChange={(e) => setFilters({ ...filters, internalGrade1: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:border-blue-600 outline-hidden font-mono"
            >
              <option value="ALL">All Internal</option>
              {STANDARD_GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtered Cohort KPI Summary Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-900 font-semibold">
              <Users className="w-3.5 h-3.5 text-blue-700" />
              Cohort: <span className="tabular-nums font-bold">{cohortStats.total}</span> (
              {((cohortStats.total / gazette.summary.totalCandidates) * 100).toFixed(1)}% of school)
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              Pass Rate: <span className="font-bold tabular-nums">{cohortStats.passRate}%</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Mean Best-5: <span className="font-bold tabular-nums">{cohortStats.mean}%</span> (Median: {cohortStats.median}%)
            </span>
          </div>

          <button
            onClick={() => exportFilteredStudentsCSV(filteredCandidates, `${gazette.fileName}_filtered_cohort.csv`)}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-slate-700 font-sans font-medium transition-colors"
          >
            <Download className="w-3 h-3 text-slate-500" />
            Download Filtered Cohort CSV
          </button>
        </div>
      </div>

      {/* Main Analysis Switch: Pivot Matrix vs Filtered Student Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        {/* Header with Tool Mode Switches */}
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setActiveTab("pivot")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "pivot"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Live Cross-Tabulation & Pivot Matrix
            </button>
            <button
              onClick={() => setActiveTab("cohort")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "cohort"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Cohort Student Register ({filteredCandidates.length})
            </button>
          </div>

          {activeTab === "pivot" && (
            <button
              onClick={() =>
                exportPivotCSV(
                  pivotMatrix,
                  `${gazette.fileName}_pivot${distinctionFilter !== "all" ? `_${distinctionFilter}` : ""}_analysis.csv`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export Pivot Matrix CSV
            </button>
          )}
        </div>

        {/* Tab 1: Pivot Studio */}
        {activeTab === "pivot" && (
          <div className="p-5 space-y-5">
            {/* Pivot Configuration Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              {/* Row Dimension */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Row Dimension
                </label>
                <select
                  value={rowDimension}
                  onChange={(e) => setRowDimension(e.target.value as PivotRowDimension)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:border-blue-600 outline-hidden font-medium"
                >
                  <option value="subject">Subject</option>
                  <option value="performanceBand">Performance Band</option>
                  <option value="gender">Gender</option>
                  <option value="result">Result Status</option>
                  <option value="internalGrade1">Internal Grade (GR1)</option>
                  <option value="subjectCombo">Subject Combination / Stream</option>
                </select>
              </div>

              {/* Column Dimension */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Column Breakdown
                </label>
                <select
                  value={colDimension}
                  onChange={(e) => setColDimension(e.target.value as PivotColDimension)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:border-blue-600 outline-hidden font-medium"
                >
                  <option value="none">None (Single Metric Summary)</option>
                  <option value="grade">Grade (A1 to E)</option>
                  <option value="performanceBand">Performance Band</option>
                  <option value="gender">Gender (M/F)</option>
                  <option value="result">Result Status</option>
                </select>
              </div>

              {/* Metric */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Aggregate Metric
                </label>
                <select
                  value={metric}
                  onChange={(e) => setMetric(e.target.value as PivotMetric)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:border-blue-600 outline-hidden font-medium"
                >
                  <option value="count">Candidate Count (N)</option>
                  <option value="meanBest5">Mean Score / %</option>
                  <option value="medianBest5">Median Score / %</option>
                  <option value="highestBest5">Highest Score / %</option>
                  <option value="lowestBest5">Lowest Score / %</option>
                  <option value="passRate">Pass Rate %</option>
                  <option value="qualityRate">Quality Rate (A1+A2 %)</option>
                </select>
              </div>

              {/* Distinction Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Distinction Filter (75–100)
                </label>
                <select
                  value={distinctionFilter}
                  onChange={(e) =>
                    setDistinctionFilter(e.target.value as PivotDistinctionFilter)
                  }
                  className={`w-full px-3 py-1.5 text-xs border rounded-md focus:border-blue-600 outline-hidden font-medium ${
                    distinctionFilter !== "all"
                      ? "bg-blue-50 border-blue-400 text-blue-900"
                      : "bg-white border-slate-200 text-slate-900"
                  }`}
                >
                  <option value="all">All Marks (0–100)</option>
                  <option value="distinction">Distinction (75–100 marks)</option>
                  <option value="below_distinction">Below Distinction (&lt;75 marks)</option>
                </select>
              </div>
            </div>

            {distinctionFilter !== "all" && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-blue-50/70 border border-blue-200 rounded-md text-xs text-blue-900">
                <span>
                  <strong>Active Matrix Filter:</strong>{" "}
                  {distinctionFilter === "distinction"
                    ? "Distinction (75 to 100 marks inclusive)"
                    : "Below Distinction (< 75 marks)"}{" "}
                  —{" "}
                  {rowDimension === "subject" || colDimension === "grade"
                    ? "applied to individual subject marks."
                    : "applied to candidate Best-5 percentage."}
                </span>
                <button
                  type="button"
                  onClick={() => setDistinctionFilter("all")}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline"
                >
                  Show all marks
                </button>
              </div>
            )}

            {/* Cross-Tabulation Matrix Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-mono text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 uppercase tracking-wider font-bold">
                      {rowDimension}
                    </th>
                    {pivotMatrix.colHeaders.map((ch) => (
                      <th key={ch} className="py-2.5 px-3 text-right uppercase tracking-wider font-bold">
                        {ch}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right uppercase tracking-wider font-bold bg-slate-200/60">
                      Total / Overall
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {pivotMatrix.rows.map((row) => (
                    <tr key={row.label} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-900 whitespace-nowrap">
                        {row.label}
                      </td>
                      {pivotMatrix.colHeaders.map((ch) => {
                        const cell = row.values[ch];
                        const val = cell?.value;
                        // Intensity calculation for count or %
                        const intensity =
                          val !== null && typeof val === "number"
                            ? Math.min(val / maxCellValue, 1)
                            : 0;

                        return (
                          <td
                            key={ch}
                            style={{
                              backgroundColor:
                                intensity > 0.05
                                  ? `rgba(37, 99, 235, ${intensity * 0.15})`
                                  : undefined,
                            }}
                            className={`py-2.5 px-3 text-right tabular-nums ${
                              val !== null && val > 0 ? "font-bold text-slate-900" : "text-slate-400"
                            }`}
                          >
                            {cell?.formatted ?? "—"}
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-3 text-right font-bold text-blue-900 bg-slate-50 tabular-nums">
                        {row.total.formatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Filtered Student Cohort Register */}
        {activeTab === "cohort" && (
          <div>
            {filteredCandidates.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <p className="text-sm font-semibold mb-1">No students match current filter criteria</p>
                <p className="text-xs text-slate-400 mb-4">
                  Adjust marks range, subject selection, or reset filters to view students.
                </p>
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 font-mono uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Roll No</th>
                      <th className="py-2.5 px-3">Candidate Name</th>
                      <th className="py-2.5 px-3 text-center">Gender</th>
                      <th className="py-2.5 px-3 text-center">Result</th>
                      {filters.subjectCode !== "ALL" && (
                        <th className="py-2.5 px-3 text-center bg-blue-50 text-blue-900 whitespace-nowrap">
                          {filters.subjectCode} ({CBSE_SUBJECT_CODES[filters.subjectCode] || "Sub"})
                        </th>
                      )}
                      <th className="py-2.5 px-3">Band</th>
                      <th className="py-2.5 px-3 text-right">Best-5 %</th>
                      <th className="py-2.5 px-3 text-right">Best-5 / 500</th>
                      <th className="py-2.5 px-3 text-right">All Marks</th>
                      <th className="py-2.5 px-3 text-center">Int. Grades</th>
                      <th className="py-2.5 px-3 text-right">Scorecard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCandidates.map((c) => {
                      const focusedSub =
                        filters.subjectCode !== "ALL"
                          ? c.subjects[filters.subjectCode]
                          : undefined;
                      return (
                        <tr
                          key={c.rollNo}
                          onClick={() => onSelectCandidate(c)}
                          className="hover:bg-slate-50 cursor-pointer transition-colors group"
                        >
                          <td className="py-2.5 px-3 font-mono text-slate-600 font-medium">
                            {c.rollNo}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 group-hover:text-blue-700">
                            {c.candidateName}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                            {c.gender}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
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
                          {filters.subjectCode !== "ALL" && (
                            <td className="py-2.5 px-3 text-center font-mono bg-blue-50/40 tabular-nums whitespace-nowrap">
                              {focusedSub && focusedSub.marks !== null ? (
                                <>
                                  <span className="font-bold text-blue-900">{focusedSub.marks}</span>
                                  <span className="text-[10px] text-slate-500 ml-1">
                                    {focusedSub.grade}
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-400">{focusedSub?.grade || "—"}</span>
                              )}
                            </td>
                          )}
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            {c.performanceBand}
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
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500 text-[11px]">
                            {`${c.internalGrade1} ${c.internalGrade2} ${c.internalGrade3}`.trim() ||
                              "—"}
                          </td>
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
        )}
      </div>
    </div>
  );
};
