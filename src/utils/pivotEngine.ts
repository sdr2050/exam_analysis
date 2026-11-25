import {
  CBSE_SUBJECT_CODES,
  STANDARD_GRADES,
  CandidateRecord,
  SubjectStat,
  PivotRowDimension,
  PivotColDimension,
  PivotMetric,
  PivotMatrixResult,
  PivotMatrixRow,
  PivotMatrixCell,
} from "../types/exam";

/**
 * Computes descriptive statistics for a list of numbers.
 */
function computeStats(numbers: number[]): {
  count: number;
  mean: number | null;
  median: number | null;
  max: number | null;
  min: number | null;
} {
  if (numbers.length === 0) {
    return { count: 0, mean: null, median: null, max: null, min: null };
  }
  const sum = numbers.reduce((a, b) => a + b, 0);
  const mean = Number((sum / numbers.length).toFixed(2));
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 !== 0
      ? sorted[mid]
      : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
  const max = Math.max(...numbers);
  const min = Math.min(...numbers);
  return { count: numbers.length, mean, median, max, min };
}

/**
 * Extracts candidate values for a specific dimension.
 */
function getCandidateDimensionValue(candidate: CandidateRecord, dim: PivotRowDimension | PivotColDimension): string {
  switch (dim) {
    case "gender":
      return candidate.gender === "M" ? "Male (M)" : candidate.gender === "F" ? "Female (F)" : candidate.gender;
    case "result":
      return candidate.result || "N/A";
    case "performanceBand":
      return candidate.performanceBand || "Unknown";
    case "internalGrade1":
      return candidate.internalGrade1 || "None";
    case "subjectCombo": {
      // Group by distinct stream / subject combination
      const codes = Object.keys(candidate.subjects).sort();
      return codes.map((c) => CBSE_SUBJECT_CODES[c] || c).join(", ");
    }
    default:
      return "All";
  }
}

/**
 * Builds a dynamic cross-tabulation pivot matrix based on row, column, and metric configuration.
 */
export function buildPivotMatrix(
  candidates: CandidateRecord[],
  subjectStats: SubjectStat[],
  rowDimension: PivotRowDimension,
  colDimension: PivotColDimension,
  metric: PivotMetric
): PivotMatrixResult {
  // Determine Column Headers
  let colHeaders: string[] = [];
  if (colDimension === "none") {
    colHeaders = ["Metric Value"];
  } else if (colDimension === "grade") {
    colHeaders = [...STANDARD_GRADES];
  } else if (colDimension === "performanceBand") {
    colHeaders = [
      "90% & Above",
      "75% - 89.9% (Distinction)",
      "60% - 74.9%",
      "50% - 59.9%",
      "Below 50%",
    ];
  } else if (colDimension === "gender") {
    const genders = Array.from(new Set(candidates.map((c) => (c.gender === "M" ? "Male (M)" : c.gender === "F" ? "Female (F)" : c.gender))));
    colHeaders = genders.sort();
  } else if (colDimension === "result") {
    const results = Array.from(new Set(candidates.map((c) => c.result || "Unknown")));
    colHeaders = results.sort();
  }

  // Determine Row Labels
  let rowLabels: { key: string; label: string }[] = [];
  if (rowDimension === "subject") {
    rowLabels = subjectStats.map((s) => ({
      key: s.subjectCode,
      label: `${s.subjectCode} — ${s.subjectName}`,
    }));
  } else if (rowDimension === "performanceBand") {
    const bands = [
      "90% & Above",
      "75% - 89.9% (Distinction)",
      "60% - 74.9%",
      "50% - 59.9%",
      "Below 50%",
    ];
    rowLabels = bands.map((b) => ({ key: b, label: b }));
  } else if (rowDimension === "gender") {
    const genders = Array.from(new Set(candidates.map((c) => (c.gender === "M" ? "Male (M)" : c.gender === "F" ? "Female (F)" : c.gender))));
    rowLabels = genders.sort().map((g) => ({ key: g, label: g }));
  } else if (rowDimension === "result") {
    const results = Array.from(new Set(candidates.map((c) => c.result || "Unknown")));
    rowLabels = results.sort().map((r) => ({ key: r, label: r }));
  } else if (rowDimension === "internalGrade1") {
    const grs = Array.from(new Set(candidates.map((c) => c.internalGrade1).filter(Boolean)));
    rowLabels = grs.sort().map((g) => ({ key: g, label: `Internal Grade ${g}` }));
  } else if (rowDimension === "subjectCombo") {
    const comboMap = new Map<string, number>();
    for (const c of candidates) {
      const k = c.subjectComboKey || "Standard Core";
      comboMap.set(k, (comboMap.get(k) || 0) + 1);
    }
    rowLabels = Array.from(comboMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([k]) => ({ key: k, label: k }));
  }

  // Helper to calculate cell metric
  function calculateCell(cands: CandidateRecord[], subCode?: string): PivotMatrixCell {
    if (cands.length === 0) {
      return { value: null, formatted: "—", sampleCount: 0 };
    }

    if (metric === "count") {
      return { value: cands.length, formatted: String(cands.length), sampleCount: cands.length };
    }

    if (metric === "passRate") {
      const pass = cands.filter((c) => c.result === "PASS").length;
      const rate = Number(((pass / cands.length) * 100).toFixed(1));
      return { value: rate, formatted: `${rate}%`, sampleCount: cands.length };
    }

    if (metric === "qualityRate") {
      // Quality: Best-5 >= 75% or for subject, Grade is A1 or A2
      if (subCode) {
        const qualityCount = cands.filter((c) => {
          const gr = c.subjects[subCode]?.grade;
          return gr === "A1" || gr === "A2";
        }).length;
        const rate = Number(((qualityCount / cands.length) * 100).toFixed(1));
        return { value: rate, formatted: `${rate}%`, sampleCount: cands.length };
      } else {
        const qualityCount = cands.filter((c) => (c.best5Percentage ?? 0) >= 75).length;
        const rate = Number(((qualityCount / cands.length) * 100).toFixed(1));
        return { value: rate, formatted: `${rate}%`, sampleCount: cands.length };
      }
    }

    // For numerical mark/percentage metrics
    let values: number[] = [];
    if (subCode) {
      values = cands
        .map((c) => c.subjects[subCode]?.marks)
        .filter((m): m is number => m !== null && !isNaN(m));
    } else {
      values = cands
        .map((c) => c.best5Percentage)
        .filter((p): p is number => p !== null && !isNaN(p));
    }

    if (values.length === 0) {
      return { value: null, formatted: "—", sampleCount: 0 };
    }

    const stats = computeStats(values);
    if (metric === "meanBest5") {
      return { value: stats.mean, formatted: stats.mean !== null ? `${stats.mean}%` : "—", sampleCount: stats.count };
    }
    if (metric === "medianBest5") {
      return { value: stats.median, formatted: stats.median !== null ? `${stats.median}%` : "—", sampleCount: stats.count };
    }
    if (metric === "highestBest5") {
      return { value: stats.max, formatted: stats.max !== null ? `${stats.max}%` : "—", sampleCount: stats.count };
    }
    if (metric === "lowestBest5") {
      return { value: stats.min, formatted: stats.min !== null ? `${stats.min}%` : "—", sampleCount: stats.count };
    }

    return { value: stats.mean, formatted: String(stats.mean), sampleCount: stats.count };
  }

  // Build matrix rows
  const rows: PivotMatrixRow[] = [];

  for (const rowItem of rowLabels) {
    let rowCands: CandidateRecord[] = [];
    let subCode: string | undefined = undefined;

    if (rowDimension === "subject") {
      subCode = rowItem.key;
      rowCands = candidates.filter((c) => c.subjects[rowItem.key] !== undefined);
    } else if (rowDimension === "performanceBand") {
      rowCands = candidates.filter((c) => c.performanceBand === rowItem.key);
    } else if (rowDimension === "gender") {
      rowCands = candidates.filter(
        (c) => (c.gender === "M" ? "Male (M)" : c.gender === "F" ? "Female (F)" : c.gender) === rowItem.key
      );
    } else if (rowDimension === "result") {
      rowCands = candidates.filter((c) => (c.result || "Unknown") === rowItem.key);
    } else if (rowDimension === "internalGrade1") {
      rowCands = candidates.filter((c) => c.internalGrade1 === rowItem.key);
    } else if (rowDimension === "subjectCombo") {
      rowCands = candidates.filter((c) => (c.subjectComboKey || "Standard Core") === rowItem.key);
    }

    const values: Record<string, PivotMatrixCell> = {};

    if (colDimension === "none") {
      values["Metric Value"] = calculateCell(rowCands, subCode);
    } else {
      for (const colHeader of colHeaders) {
        let cellCands: CandidateRecord[] = [];

        if (colDimension === "grade") {
          // If row is subject, check this subject's grade
          if (subCode) {
            cellCands = rowCands.filter((c) => c.subjects[subCode!]?.grade === colHeader);
          } else {
            // Count candidates who have at least one subject with this grade
            cellCands = rowCands.filter((c) =>
              Object.values(c.subjects).some((s) => s.grade === colHeader)
            );
          }
        } else if (colDimension === "performanceBand") {
          cellCands = rowCands.filter((c) => c.performanceBand === colHeader);
        } else if (colDimension === "gender") {
          cellCands = rowCands.filter(
            (c) => (c.gender === "M" ? "Male (M)" : c.gender === "F" ? "Female (F)" : c.gender) === colHeader
          );
        } else if (colDimension === "result") {
          cellCands = rowCands.filter((c) => (c.result || "Unknown") === colHeader);
        }

        values[colHeader] = calculateCell(cellCands, subCode);
      }
    }

    const totalCell = calculateCell(rowCands, subCode);
    rows.push({
      label: rowItem.label,
      values,
      total: totalCell,
    });
  }

  const overallTotal = calculateCell(candidates);

  return {
    rowDimension,
    colDimension,
    metric,
    colHeaders,
    rows,
    overallTotal,
  };
}
