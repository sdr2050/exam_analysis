import React, { useState, useRef } from "react";
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { parseCbseGazette } from "../utils/gazetteParser";
import { ParsedGazette } from "../types/exam";
import { SAMPLE_GAZETTE_TEXT, SAMPLE_GAZETTE_FILENAME } from "../data/sampleGazette";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGazetteLoaded: (gazette: ParsedGazette) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onGazetteLoaded,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFileContent = (content: string, filename: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const parsed = parseCbseGazette(content, filename);
      if (parsed.candidates.length === 0) {
        setError(
          "Could not detect valid CBSE candidate roll number records in this file. Please ensure the file is an official CBSE Gazette .TXT file (e.g. starting with DATE, REGION, ROLL NO columns)."
        );
        setIsProcessing(false);
        return;
      }
      onGazetteLoaded(parsed);
      setIsProcessing(false);
      onClose();
    } catch (err: any) {
      setError(`Failed to parse gazette file: ${err?.message || "Unknown error"}`);
      setIsProcessing(false);
    }
  };

  const handleFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("Please upload a .TXT file (CBSE Gazette Text Format).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processFileContent(text, file.name);
    };
    reader.onerror = () => {
      setError("Error reading the selected file.");
    };
    reader.readAsText(file, "utf-8");
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
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSample = () => {
    processFileContent(SAMPLE_GAZETTE_TEXT, SAMPLE_GAZETTE_FILENAME);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="relative bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <Upload className="w-5 h-5 text-blue-700" />
            <span>Upload CBSE Gazette File (.TXT)</span>
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
          Upload any official CBSE Class 12 Senior School Certificate Examination (School / Roll No Wise Gazette) in plaintext <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">.TXT</code> format.
        </p>

        {/* Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-blue-600 bg-blue-50/50"
              : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.TXT"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>

          <p className="text-sm font-semibold text-slate-800 mb-1">
            {dragActive ? "Drop the .TXT gazette here" : "Click to browse or drop file here"}
          </p>
          <p className="text-xs text-slate-500 font-mono">
            Accepts .txt / .TXT gazette files
          </p>

          {isProcessing && (
            <p className="text-xs text-blue-700 font-medium mt-3 animate-pulse">
              Parsing candidates and compiling statistics...
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

        {/* Footer with Sample Reload Option */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleLoadSample}
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reload Demo Gazette (Sample Data)
          </button>

          <button
            onClick={onClose}
            type="button"
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
