import { CBSE_SUBJECT_CODES, ParsedGazette, CandidateRecord, PivotMatrixResult } from "../types/exam";

/**
 * Escapes a single CSV value according to RFC-4180 rules.
 */
function escapeCsvValue(val: any): string {
  if (val === null || val === undefined || val === "") {
    return "";
  }
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Triggers a browser file download for text/csv content.
 */
function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports the Complete Result CSV matching the Python script's schema.
 */
export function exportCompleteResultCSV(gazette: ParsedGazette): void {
  const baseName = gazette.fileName.replace(/\.[^/.]+$/, "");
  const filename = `${baseName}_complete_result.csv`;

  // Standard Header columns
  const headerCols: string[] = [
    "School_Code",
    "School_Name",
    "Region",
    "Exam_Date",
    "Roll_No",
    "Candidate_Name",
    "Gender",
    "Result",
    "Compartment_Sub",
    "Internal_Grade_1",
    "Internal_Grade_2",
    "Internal_Grade_3",
  ];

  // Subject Columns (<Code>_<Name>_Marks, <Code>_<Name>_Grade)
  for (const code of gazette.sortedSubjectCodes) {
    const rawName = CBSE_SUBJECT_CODES[code] || `Subject_${code}`;
    const cleanSubName = rawName.replace(/\s+/g, "_");
    headerCols.push(`${code}_${cleanSubName}_Marks`);
    headerCols.push(`${code}_${cleanSubName}_Grade`);
  }

  // Trailing Summary Columns
  headerCols.push(
    "Total_Marks_All",
    "Percentage_All",
    "Best5_Total_500",
    "Best5_Percentage",
    "Rank_Best5"
  );

  const lines: string[] = [headerCols.map(escapeCsvValue).join(",")];

  for (const c of gazette.candidates) {
    const rowVals: any[] = [
      c.schoolCode,
      c.schoolName,
      c.region,
      c.examDate,
      c.rollNo,
      c.candidateName,
      c.gender,
      c.result,
      c.compartmentSub,
      c.internalGrade1,
      c.internalGrade2,
      c.internalGrade3,
    ];

    for (const code of gazette.sortedSubjectCodes) {
      const sub = c.subjects[code];
      if (sub && sub.marks !== null) {
        rowVals.push(sub.marks);
        rowVals.push(sub.grade);
      } else {
        rowVals.push("");
        rowVals.push(sub ? sub.grade : "");
      }
    }

    rowVals.push(
      c.totalMarksAll !== null ? c.totalMarksAll : "",
      c.percentageAll !== null ? c.percentageAll : "",
      c.best5Total !== null ? c.best5Total : "",
      c.best5Percentage !== null ? c.best5Percentage : "",
      c.rankBest5 !== null ? c.rankBest5 : ""
    );

    lines.push(rowVals.map(escapeCsvValue).join(","));
  }

  downloadFile(lines.join("\r\n"), filename);
}

/**
 * Exports the Subject Analysis CSV matching the Python script's schema.
 */
export function exportSubjectAnalysisCSV(gazette: ParsedGazette): void {
  const baseName = gazette.fileName.replace(/\.[^/.]+$/, "");
  const filename = `${baseName}_subject_analysis.csv`;

  const headers = [
    "Subject_Code",
    "Subject_Name",
    "Students_Appeared",
    "Total_Marks_Sum",
    "Quality_Index",
    "Mean_Marks",
    "Median_Marks",
    "Highest_Marks",
    "Lowest_Marks",
    "Pass_Count",
    "Pass_Percentage",
    "Grade_A1",
    "Grade_A2",
    "Grade_B1",
    "Grade_B2",
    "Grade_C1",
    "Grade_C2",
    "Grade_D1",
    "Grade_D2",
    "Grade_E",
  ];

  const lines: string[] = [headers.map(escapeCsvValue).join(",")];

  for (const s of gazette.subjectStats) {
    const rowVals = [
      s.subjectCode,
      s.subjectName,
      s.studentsAppeared,
      s.totalMarksSum,
      s.qualityIndex,
      s.meanMarks,
      s.medianMarks,
      s.highestMarks,
      s.lowestMarks,
      s.passCount,
      s.passPercentage,
      s.gradeCounts["A1"] || 0,
      s.gradeCounts["A2"] || 0,
      s.gradeCounts["B1"] || 0,
      s.gradeCounts["B2"] || 0,
      s.gradeCounts["C1"] || 0,
      s.gradeCounts["C2"] || 0,
      s.gradeCounts["D1"] || 0,
      s.gradeCounts["D2"] || 0,
      s.gradeCounts["E"] || 0,
    ];
    lines.push(rowVals.map(escapeCsvValue).join(","));
  }

  downloadFile(lines.join("\r\n"), filename);
}

/**
 * Exports Top 5 Students from Each Subject alongside Subject Quality Index.
 */
export function exportSubjectToppersCSV(gazette: ParsedGazette): void {
  const baseName = gazette.fileName.replace(/\.[^/.]+$/, "");
  const filename = `${baseName}_subject_top5_students.csv`;

  const headers = [
    "Subject_Code",
    "Subject_Name",
    "Students_Appeared",
    "Total_Marks_Sum",
    "Quality_Index",
    "Subject_Rank",
    "Roll_No",
    "Candidate_Name",
    "Gender",
    "Marks",
    "Grade",
    "Overall_Result",
    "Best5_Percentage",
  ];

  const lines: string[] = [headers.map(escapeCsvValue).join(",")];

  for (const s of gazette.subjectStats) {
    for (const topper of s.topStudents) {
      const rowVals = [
        s.subjectCode,
        s.subjectName,
        s.studentsAppeared,
        s.totalMarksSum,
        s.qualityIndex,
        topper.rank,
        topper.candidate.rollNo,
        topper.candidate.candidateName,
        topper.candidate.gender,
        topper.marks,
        topper.grade,
        topper.candidate.result,
        topper.candidate.best5Percentage ?? "",
      ];
      lines.push(rowVals.map(escapeCsvValue).join(","));
    }
  }

  downloadFile(lines.join("\r\n"), filename);
}

/**
 * Exports custom filtered candidate list.
 */
export function exportFilteredStudentsCSV(candidates: CandidateRecord[], fileName = "custom_cohort.csv"): void {
  const headers = [
    "Roll_No",
    "Candidate_Name",
    "Gender",
    "Result",
    "Performance_Band",
    "Rank_Best5",
    "Best5_Percentage",
    "Best5_Total_500",
    "Percentage_All",
    "Total_Marks_All",
    "Internal_Grades",
  ];

  const lines: string[] = [headers.map(escapeCsvValue).join(",")];

  for (const c of candidates) {
    const rowVals = [
      c.rollNo,
      c.candidateName,
      c.gender,
      c.result,
      c.performanceBand,
      c.rankBest5 ?? "",
      c.best5Percentage ?? "",
      c.best5Total ?? "",
      c.percentageAll ?? "",
      c.totalMarksAll ?? "",
      `${c.internalGrade1} ${c.internalGrade2} ${c.internalGrade3}`.trim(),
    ];
    lines.push(rowVals.map(escapeCsvValue).join(","));
  }

  downloadFile(lines.join("\r\n"), fileName);
}

/**
 * Exports Pivot Matrix results to CSV.
 */
export function exportPivotCSV(pivot: PivotMatrixResult, filename = "custom_pivot_analysis.csv"): void {
  const headers = [pivot.rowDimension.toUpperCase(), ...pivot.colHeaders, "Total / Overall"];
  const lines: string[] = [headers.map(escapeCsvValue).join(",")];

  for (const row of pivot.rows) {
    const rowVals: any[] = [row.label];
    for (const ch of pivot.colHeaders) {
      const cell = row.values[ch];
      rowVals.push(cell && cell.value !== null ? cell.formatted : "");
    }
    rowVals.push(row.total.value !== null ? row.total.formatted : "");
    lines.push(rowVals.map(escapeCsvValue).join(","));
  }

  // Summary row
  const summaryVals: any[] = ["OVERALL"];
  for (const ch of pivot.colHeaders) {
    // compute column sum or avg if applicable
    const nonNullCells = pivot.rows
      .map((r) => r.values[ch])
      .filter((c) => c && c.value !== null);
    if (nonNullCells.length > 0) {
      if (pivot.metric === "count") {
        const sum = nonNullCells.reduce((a, b) => a + (b.value ?? 0), 0);
        summaryVals.push(sum);
      } else {
        const avg = nonNullCells.reduce((a, b) => a + (b.value ?? 0), 0) / nonNullCells.length;
        summaryVals.push(Number(avg.toFixed(2)));
      }
    } else {
      summaryVals.push("");
    }
  }
  summaryVals.push(pivot.overallTotal.value !== null ? pivot.overallTotal.formatted : "");
  lines.push(summaryVals.map(escapeCsvValue).join(","));

  downloadFile(lines.join("\r\n"), filename);
}
