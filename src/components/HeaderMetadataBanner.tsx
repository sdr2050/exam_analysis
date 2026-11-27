import React from "react";
import {
  School,
  Calendar,
  MapPin,
  FileCode,
  RotateCcw,
  FileSpreadsheet,
  Check,
  X,
} from "lucide-react";
import { ParsedGazette } from "../types/exam";
import { SAMPLE_GAZETTE_FILENAME } from "../data/sampleGazette";

interface HeaderMetadataBannerProps {
  fullGazette: ParsedGazette;
  activeGazette: ParsedGazette;
  selectedSections: string[];
  onToggleSection: (section: string) => void;
  onClearSectionFilter: () => void;
  onResetToSample: () => void;
  onOpenUpload: () => void;
  onOpenSectionUpload: () => void;
  onClearSectionMapping: () => void;
}

export const HeaderMetadataBanner: React.FC<HeaderMetadataBannerProps> = ({
  fullGazette,
  activeGazette,
  selectedSections,
  onToggleSection,
  onClearSectionFilter,
  onResetToSample,
  onOpenUpload,
  onOpenSectionUpload,
  onClearSectionMapping,
}) => {
  const isSample = fullGazette.fileName === SAMPLE_GAZETTE_FILENAME;
  const hasSections = fullGazette.sections.length > 0;

  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-5">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left Side: School & Exam Details */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
              <School className="w-3.5 h-3.5" />
              <span>{fullGazette.examTitle}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {fullGazette.schoolName}
            </h1>

            {/* Unboxed Metadata with Typographic Separator */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-medium">
              <span className="font-mono">School Code: {fullGazette.schoolCode}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                Region: {fullGazette.region}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                Exam Date: {fullGazette.examDate}
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {selectedSections.length > 0
                  ? `${activeGazette.summary.totalCandidates} of ${fullGazette.summary.totalCandidates} Candidates (Section Filtered)`
                  : `${fullGazette.summary.totalCandidates} Total Candidates`}
              </span>
            </div>
          </div>

          {/* Right Side: Active File Context & Section Upload Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs">
              <div className="flex items-center gap-1.5 px-1.5 text-slate-600">
                <FileCode className="w-4 h-4 text-blue-600" />
                <span
                  className="font-mono font-medium truncate max-w-[140px] sm:max-w-[190px]"
                  title={fullGazette.fileName}
                >
                  {fullGazette.fileName}
                </span>
              </div>

              {!isSample ? (
                <button
                  onClick={onResetToSample}
                  className="inline-flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
                  title="Reset view to sample demo gazette"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 font-mono px-1">
                  (Sample)
                </span>
              )}

              <button
                onClick={onOpenUpload}
                className="px-2 py-1 text-blue-700 hover:text-blue-800 hover:bg-blue-50 font-medium rounded transition-colors"
              >
                Switch File
              </button>
            </div>

            {/* Section Mapping File Button / Status */}
            {hasSections ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                <span
                  className="font-mono font-medium text-emerald-900 truncate max-w-[140px]"
                  title={`${fullGazette.sectionFileName} (${fullGazette.sectionMatchedCount} matched)`}
                >
                  {fullGazette.sectionFileName}
                </span>
                <button
                  onClick={onOpenSectionUpload}
                  className="px-2 py-0.5 text-emerald-800 hover:bg-emerald-100 font-medium rounded transition-colors"
                >
                  Change
                </button>
                <button
                  onClick={onClearSectionMapping}
                  className="p-1 text-emerald-700 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                  title="Remove section mapping file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenSectionUpload}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap"
                title="Upload a CSV or XLSX file with Stu_Name, CBSE_Roll_No, and Section"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>Upload Sections (.CSV/.XLSX)</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Section Filter Bar (shown when a Section file is loaded) */}
        {hasSections && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mr-1">
                Filter by Section (Quality Index, Distinction, Top 5 &amp; Reports):
              </span>
              <button
                type="button"
                onClick={onClearSectionFilter}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                  selectedSections.length === 0
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {selectedSections.length === 0 && <Check className="w-3 h-3" />}
                All Sections ({fullGazette.candidates.length})
              </button>

              {fullGazette.sections.map((sec) => {
                const count = fullGazette.candidates.filter(
                  (c) => (c.section || "Unassigned") === sec
                ).length;
                const isSelected = selectedSections.includes(sec);
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => onToggleSection(sec)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium rounded-md border transition-colors ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-900 border-emerald-400"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-xs border ${
                        isSelected
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span>
                      {sec === "Unassigned" ? "Unassigned" : `Sec ${sec}`} ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] font-mono text-slate-500">
              Matched {fullGazette.sectionMatchedCount ?? 0}/{fullGazette.candidates.length} roll numbers
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
