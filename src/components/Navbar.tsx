import React from "react";
import {
  FileText,
  Upload,
  Printer,
  Download,
  BarChart2,
  Users,
  SlidersHorizontal,
  GraduationCap,
} from "lucide-react";

interface NavbarProps {
  activeTab: "overview" | "subjects" | "custom" | "students";
  setActiveTab: (tab: "overview" | "subjects" | "custom" | "students") => void;
  onOpenUpload: () => void;
  onExportCompleteCSV: () => void;
  onExportSubjectCSV: () => void;
  onPrint: () => void;
  schoolCode: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenUpload,
  onExportCompleteCSV,
  onExportSubjectCSV,
  onPrint,
  schoolCode,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">
                EXAM ANALYSIS
              </span>
              <span className="text-[11px] font-mono text-slate-500 block leading-tight">
                Gazette Lens · {schoolCode ? `Sch #${schoolCode}` : "CBSE Portal"}
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "overview"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Executive Overview
            </button>

            <button
              onClick={() => setActiveTab("subjects")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "subjects"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Subject Breakdown
            </button>

            <button
              onClick={() => setActiveTab("custom")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "custom"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Custom Analysis
            </button>

            <button
              onClick={() => setActiveTab("students")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === "students"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Student Register
            </button>
          </nav>

          {/* Zone 3: Primary Action & Export Menu */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Export Dropdown */}
            <div className="relative group">
              <button
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                title="Download CSV Exports matching Python script"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 hidden group-hover:block hover:block z-50">
                <button
                  onClick={onExportCompleteCSV}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span>Complete Result CSV</span>
                  <span className="text-[10px] text-slate-400 font-mono">Roll-wise</span>
                </button>
                <button
                  onClick={onExportSubjectCSV}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                >
                  <span>Subject Analysis CSV</span>
                  <span className="text-[10px] text-slate-400 font-mono">Stats</span>
                </button>
              </div>
            </div>

            {/* Print / Save PDF */}
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              title="Print academic summary report"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Print Report</span>
            </button>

            {/* Upload Button */}
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Gazette (.TXT)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200 bg-slate-50 px-2 py-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-2.5 py-1 text-xs font-medium rounded ${
            activeTab === "overview" ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("subjects")}
          className={`px-2.5 py-1 text-xs font-medium rounded ${
            activeTab === "subjects" ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          Subjects
        </button>
        <button
          onClick={() => setActiveTab("custom")}
          className={`px-2.5 py-1 text-xs font-medium rounded ${
            activeTab === "custom" ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          Custom
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`px-2.5 py-1 text-xs font-medium rounded ${
            activeTab === "students" ? "bg-slate-900 text-white" : "text-slate-600"
          }`}
        >
          Students
        </button>
      </div>
    </header>
  );
};
