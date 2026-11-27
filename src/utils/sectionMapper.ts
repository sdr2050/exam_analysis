import * as XLSX from "xlsx";
import { CandidateRecord, ParsedGazette } from "../types/exam";
import { recomputeGazetteFromCandidates } from "./gazetteParser";

export interface SectionMappingEntry {
  stuName: string;
  cbseRollNo: string;
  section: string;
}

export interface ParsedSectionFile {
  fileName: string;
  entries: SectionMappingEntry[];
  rollToSection: Record<string, string>;
  nameToSection: Record<string, string>;
}

/**
 * Normalizes column header names for flexible matching of Stu_Name, CBSE_Roll_No, Section.
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Normalizes a CBSE Roll Number value (handles Excel numeric cells like 90000001.0).
 */
export function normalizeRollNo(val: unknown): string {
  if (val === null || val === undefined) return "";
  let s = String(val).trim();
  if (!s) return "";
  // Strip Excel decimal suffix like "90000001.0"
  if (/^\d+\.0+$/.test(s)) {
    s = s.replace(/\.0+$/, "");
  }
  // Handle scientific notation if Excel formatted large roll number as float
  if (/^\d+(\.\d+)?e\+?\d+$/i.test(s)) {
    const num = Number(s);
    if (!isNaN(num) && isFinite(num)) {
      s = Math.round(num).toString();
    }
  }
  return s.replace(/\s+/g, "");
}

/**
 * Normalizes a student name for fallback matching.
 */
function normalizeName(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim().toUpperCase().replace(/\s+/g, " ");
}

/**
 * Parses an uploaded CSV, TSV, XLSX, or XLS file containing Stu_Name, CBSE_Roll_No, and Section.
 */
export async function parseSectionMappingFile(file: File): Promise<ParsedSectionFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("The uploaded file contains no readable sheets.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rows.length === 0) {
    throw new Error("No data rows were found in the uploaded section file.");
  }

  const headers = Object.keys(rows[0]);
  const rollCandidates = [
    "cbserollno",
    "rollno",
    "rollnumber",
    "cbseroll",
    "roll",
    "cbserollnum",
  ];
  const sectionCandidates = [
    "section",
    "sec",
    "classsection",
    "classsec",
    "division",
    "div",
  ];
  const nameCandidates = [
    "stuname",
    "studentname",
    "candidatename",
    "name",
    "student",
  ];

  const findHeader = (accepted: string[]) =>
    headers.find((h) => accepted.includes(normalizeHeader(h)));

  const rollCol = findHeader(rollCandidates);
  const sectionCol = findHeader(sectionCandidates);
  const nameCol = findHeader(nameCandidates);

  if (!rollCol || !sectionCol) {
    throw new Error(
      `Missing required columns. Expected "Stu_Name", "CBSE_Roll_No", and "Section". Found: ${headers.join(", ")}`
    );
  }

  const entries: SectionMappingEntry[] = [];
  const rollToSection: Record<string, string> = {};
  const nameCounts: Record<string, number> = {};
  const rawNameToSection: Record<string, string> = {};

  for (const row of rows) {
    const roll = normalizeRollNo(row[rollCol]);
    const sec = String(row[sectionCol] ?? "").trim();
    const stuName = nameCol ? String(row[nameCol] ?? "").trim() : "";

    if (!sec) continue;
    if (!roll && !stuName) continue;

    entries.push({
      stuName,
      cbseRollNo: roll,
      section: sec,
    });

    if (roll) {
      rollToSection[roll] = sec;
    }
    if (stuName) {
      const normName = normalizeName(stuName);
      nameCounts[normName] = (nameCounts[normName] || 0) + 1;
      rawNameToSection[normName] = sec;
    }
  }

  if (entries.length === 0) {
    throw new Error(
      "No valid student section rows found. Ensure CBSE_Roll_No and Section values are filled in."
    );
  }

  // Only keep unique names for safe fallback matching
  const nameToSection: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawNameToSection)) {
    if (nameCounts[k] === 1) {
      nameToSection[k] = v;
    }
  }

  return {
    fileName: file.name,
    entries,
    rollToSection,
    nameToSection,
  };
}

/**
 * Merges a parsed Section mapping into a ParsedGazette, matching primarily by CBSE_Roll_No
 * and falling back to unique Stu_Name matches.
 */
export function applySectionMappingToGazette(
  gazette: ParsedGazette,
  mapping: ParsedSectionFile
): ParsedGazette {
  let matchedCount = 0;
  const sectionSet = new Set<string>();

  const updatedCandidates: CandidateRecord[] = gazette.candidates.map((cand) => {
    const rollKey = normalizeRollNo(cand.rollNo);
    let sec = mapping.rollToSection[rollKey];
    if (!sec) {
      const nameKey = normalizeName(cand.candidateName);
      sec = mapping.nameToSection[nameKey];
    }

    if (sec) {
      matchedCount++;
      sectionSet.add(sec);
      return { ...cand, section: sec };
    }
    sectionSet.add("Unassigned");
    return { ...cand, section: "Unassigned" };
  });

  const sections = Array.from(sectionSet).sort((a, b) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  });

  return recomputeGazetteFromCandidates(gazette, updatedCandidates, {
    sections,
    sectionFileName: mapping.fileName,
    sectionMatchedCount: matchedCount,
  });
}

/**
 * Clears any loaded section mapping from a ParsedGazette.
 */
export function clearSectionMappingFromGazette(gazette: ParsedGazette): ParsedGazette {
  const clearedCandidates = gazette.candidates.map((c) => {
    const { section: _removed, ...rest } = c;
    return rest;
  });

  return recomputeGazetteFromCandidates(gazette, clearedCandidates, {
    sections: [],
    sectionFileName: undefined,
    sectionMatchedCount: undefined,
  });
}

/**
 * Downloads a ready-to-fill CSV template with Stu_Name, CBSE_Roll_No, Section
 * pre-populated with the currently loaded gazette's students.
 */
export function downloadSectionTemplateCSV(gazette: ParsedGazette): void {
  const escapeCsv = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines = ["Stu_Name,CBSE_Roll_No,Section"];
  for (const c of gazette.candidates) {
    const existingSection =
      c.section && c.section !== "Unassigned" ? c.section : "";
    lines.push(
      [c.candidateName, c.rollNo, existingSection].map(escapeCsv).join(",")
    );
  }

  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const baseName = gazette.fileName.replace(/\.[^/.]+$/, "");
  link.setAttribute("href", url);
  link.setAttribute("download", `${baseName}_section_mapping_template.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
