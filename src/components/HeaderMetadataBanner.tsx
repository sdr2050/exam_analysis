import React from "react";
import { School, Calendar, MapPin, FileCode, RotateCcw } from "lucide-react";
import { ParsedGazette } from "../types/exam";
import { SAMPLE_GAZETTE_FILENAME } from "../data/sampleGazette";

interface HeaderMetadataBannerProps {
  gazette: ParsedGazette;
  onResetToSample: () => void;
  onOpenUpload: () => void;
}

export const HeaderMetadataBanner: React.FC<HeaderMetadataBannerProps> = ({
  gazette,
  onResetToSample,
  onOpenUpload,
}) => {
  const isSample = gazette.fileName === SAMPLE_GAZETTE_FILENAME;

  return (
    <div className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left Side: School & Exam Details */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
            <School className="w-3.5 h-3.5" />
            <span>{gazette.examTitle}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {gazette.schoolName}
          </h1>

          {/* Unboxed Metadata with Typographic Separator (§1.A anti-slop) */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-medium">
            <span className="font-mono">School Code: {gazette.schoolCode}</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              Region: {gazette.region}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              Exam Date: {gazette.examDate}
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {gazette.summary.totalCandidates} Total Candidates
            </span>
          </div>
        </div>

        {/* Right Side: Active File Context & Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs">
          <div className="flex items-center gap-1.5 px-1.5 text-slate-600">
            <FileCode className="w-4 h-4 text-blue-600" />
            <span className="font-mono font-medium truncate max-w-[160px] sm:max-w-[220px]" title={gazette.fileName}>
              {gazette.fileName}
            </span>
          </div>

          {!isSample ? (
            <button
              onClick={onResetToSample}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
              title="Reset view to sample demo gazette"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Sample</span>
            </button>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono px-1">
              (Sample Gazette)
            </span>
          )}

          <button
            onClick={onOpenUpload}
            className="px-2.5 py-1 text-blue-700 hover:text-blue-800 hover:bg-blue-50 font-medium rounded transition-colors"
          >
            Switch File
          </button>
        </div>
      </div>
    </div>
  );
};
