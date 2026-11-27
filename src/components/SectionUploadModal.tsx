import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Download,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { ParsedGazette } from "../types/exam";
import {
  parseSectionMappingFile,
  ParsedSectionFile,
  downloadSectionTemplateCSV,
} from "../utils/sectionMapper";

interface SectionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  gazette: ParsedGazette;
  onSectionMappingLoaded: (mapping: ParsedSectionFile) => void;
  onClearSectionMapping: () => void;
}

export const SectionUploadModal: React.FC<SectionUploadModalProps> = ({
  isOpen,
  onClose,
  gazette,
  onSectionMappingLoaded,
  onClearSectionMapping,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    const ext = file.name.toLowerCase().split(".").pop() || "";
    if (!["csv", "xlsx", "xls", "tsv", "txt"].includes(ext)) {
      setError("Please upload a .CSV, .XLSX, .XLS, or .TSV file containing Stu_Name, CBSE_Roll_No, and Section.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const mapping = await parseSectionMappingFile(file);
      onSectionMappingLoaded(mapping);
      setIsProcessing(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to parse section mapping file.");
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            <span>Upload Student Section File (.CSV / .XLSX)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-xs text-slate-600 mt-3 leading-relaxed">
          Upload a spreadsheet or CSV file with three columns:{" "}
          <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">Stu_Name</code>,{" "}
          <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">CBSE_Roll_No</code>, and{" "}
          <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">Section</code>.
          Students are matched by CBSE Roll Number to enable section-wise filtering across Quality Index, Distinction, Top 5, and Pivot Matrix.
        </p>

        {/* Active Section File Status */}
        {gazette.sectionFileName && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2 text-xs text-emerald-900">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <div className="font-semibold truncate">{gazette.sectionFileName}</div>
                <div className="text-[11px] font-mono text-emerald-700">
                  Matched {gazette.sectionMatchedCount ?? 0} / {gazette.candidates.length} students across{" "}
                  {gazette.sections.filter((s) => s !== "Unassigned").length} section(s)
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClearSectionMapping();
                onClose();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded transition-colors shrink-0"
            >
              <Trash2 className="w-3 h-3" />
              Remove
            </button>
          </div>
        )}

        {/* Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-emerald-600 bg-emerald-50/50"
              : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.tsv,.txt"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                void handleFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <Upload className="w-6 h-6" />
          </div>

          <p className="text-sm font-semibold text-slate-800 mb-1">
            {dragActive ? "Drop the section file here" : "Click to browse or drop CSV / XLSX file"}
          </p>
          <p className="text-xs text-slate-500 font-mono">
            Columns: Stu_Name, CBSE_Roll_No, Section
          </p>

          {isProcessing && (
            <p className="text-xs text-emerald-700 font-medium mt-3 animate-pulse">
              Reading spreadsheet and matching roll numbers...
            </p>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer with Template Download */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={() => downloadSectionTemplateCSV(gazette)}
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            title="Downloads a CSV pre-filled with this gazette's student names and roll numbers"
          >
            <Download className="w-3.5 h-3.5" />
            Download Template CSV
          </button>

          <button
            onClick={onClose}
            type="button"
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
