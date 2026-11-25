/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { parseCbseGazette } from "./utils/gazetteParser";
import { ParsedGazette, CandidateRecord } from "./types/exam";
import { SAMPLE_GAZETTE_TEXT, SAMPLE_GAZETTE_FILENAME } from "./data/sampleGazette";
import { exportCompleteResultCSV, exportSubjectAnalysisCSV } from "./utils/csvExporter";
import { Navbar } from "./components/Navbar";
import { HeaderMetadataBanner } from "./components/HeaderMetadataBanner";
import { ExecutiveOverview } from "./components/ExecutiveOverview";
import { SubjectBreakdown } from "./components/SubjectBreakdown";
import { CustomAnalysisWorkbench } from "./components/CustomAnalysisWorkbench";
import { StudentDirectory } from "./components/StudentDirectory";
import { StudentScorecardDrawer } from "./components/StudentScorecardDrawer";
import { UploadModal } from "./components/UploadModal";
import { PrintableReport } from "./components/PrintableReport";

export default function App() {
  // Initialize with bundled sample gazette for instant zero-latency load
  const [gazette, setGazette] = useState<ParsedGazette>(() => {
    return parseCbseGazette(SAMPLE_GAZETTE_TEXT, SAMPLE_GAZETTE_FILENAME);
  });

  const [activeTab, setActiveTab] = useState<"overview" | "subjects" | "custom" | "students">("overview");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRecord | null>(null);

  // Cross-view drill down state
  const [drillDownBand, setDrillDownBand] = useState<string | undefined>(undefined);
  const [drillDownSubject, setDrillDownSubject] = useState<string | undefined>(undefined);
  const [drillDownGrade, setDrillDownGrade] = useState<string | undefined>(undefined);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleResetToSample = () => {
    const sample = parseCbseGazette(SAMPLE_GAZETTE_TEXT, SAMPLE_GAZETTE_FILENAME);
    setGazette(sample);
    setDrillDownBand(undefined);
    setDrillDownSubject(undefined);
    setDrillDownGrade(undefined);
    showToast("Restored sample demo gazette");
  };

  const handleGazetteLoaded = (newGazette: ParsedGazette) => {
    setGazette(newGazette);
    setActiveTab("overview");
    setDrillDownBand(undefined);
    setDrillDownSubject(undefined);
    setDrillDownGrade(undefined);
    showToast(`Loaded ${newGazette.fileName} (${newGazette.summary.totalCandidates} candidates)`);
  };

  const handleExportComplete = () => {
    exportCompleteResultCSV(gazette);
    showToast(`Exported ${gazette.fileName.replace(/\.[^/.]+$/, "")}_complete_result.csv`);
  };

  const handleExportSubject = () => {
    exportSubjectAnalysisCSV(gazette);
    showToast(`Exported ${gazette.fileName.replace(/\.[^/.]+$/, "")}_subject_analysis.csv`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Drill-down triggers
  const handleFilterByBand = (bandLabel: string) => {
    setDrillDownBand(bandLabel);
    setDrillDownSubject(undefined);
    setDrillDownGrade(undefined);
    setActiveTab("custom");
  };

  const handleFilterByGrade = (grade: string) => {
    setDrillDownGrade(grade);
    setDrillDownBand(undefined);
    setDrillDownSubject(undefined);
    setActiveTab("custom");
  };

  const handleFilterBySubject = (subjectCode: string) => {
    setDrillDownSubject(subjectCode);
    setDrillDownBand(undefined);
    setDrillDownGrade(undefined);
    setActiveTab("custom");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        onExportCompleteCSV={handleExportComplete}
        onExportSubjectCSV={handleExportSubject}
        onPrint={handlePrint}
        schoolCode={gazette.schoolCode}
      />

      {/* Header Metadata Banner */}
      <div className="no-print">
        <HeaderMetadataBanner
          gazette={gazette}
          onResetToSample={handleResetToSample}
          onOpenUpload={() => setIsUploadOpen(true)}
        />
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 no-print">
        {activeTab === "overview" && (
          <ExecutiveOverview
            gazette={gazette}
            onSelectCandidate={setSelectedCandidate}
            onFilterByBand={handleFilterByBand}
            onFilterByGrade={handleFilterByGrade}
            onNavigateToSubjects={() => setActiveTab("subjects")}
          />
        )}

        {activeTab === "subjects" && (
          <SubjectBreakdown
            gazette={gazette}
            onFilterBySubject={handleFilterBySubject}
          />
        )}

        {activeTab === "custom" && (
          <CustomAnalysisWorkbench
            gazette={gazette}
            onSelectCandidate={setSelectedCandidate}
            initialBand={drillDownBand}
            initialSubject={drillDownSubject}
            initialGrade={drillDownGrade}
          />
        )}

        {activeTab === "students" && (
          <StudentDirectory
            gazette={gazette}
            onSelectCandidate={setSelectedCandidate}
          />
        )}
      </main>

      {/* Individual Student Scorecard Drawer */}
      <StudentScorecardDrawer
        candidate={selectedCandidate}
        subjectStats={gazette.subjectStats}
        onClose={() => setSelectedCandidate(null)}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onGazetteLoaded={handleGazetteLoaded}
      />

      {/* Printable Report Stylesheet & Layout (@media print) */}
      <PrintableReport gazette={gazette} />

      {/* Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-mono px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150 no-print flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
