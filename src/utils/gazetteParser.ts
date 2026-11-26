import {
  CBSE_SUBJECT_CODES,
  STANDARD_GRADES,
  CandidateRecord,
  SubjectScore,
  SubjectStat,
  SubjectTopper,
  PerformanceBandCount,
  OverallSummary,
  ParsedGazette,
  AcademicInsight,
} from "../types/exam";

/**
 * Parses raw CBSE Gazette .TXT content into structured academic records.
 * Faithfully mirrors the Python parse_cbse_gazette & build_subject_analysis logic.
 */
export function parseCbseGazette(text: string, fileName = "gazette.txt"): ParsedGazette {
  const lines = text.split(/\r?\n/);

  // Extract metadata
  const dateMatch = text.match(/DATE:-\s*(\S+)/i);
  const regionMatch = text.match(/REGION:\s*([A-Z0-9\-]+)/i);
  const schoolMatch = text.match(/SCHOOL\s*:\s*-\s*(\d+)\s+([^\r\n]+)/i);
  const examTitleMatch =
    text.match(/(C\.B\.S\.E\.\s*-[^\r\n]+?)(?=\s+REGION|\s+PAGE|\r|\n|$)/i) ||
    text.match(/DATE:-\s*\S+\s+([^\r\n]+?)(?=\s+REGION|\s+PAGE|\r|\n|$)/i);

  const examDate = dateMatch ? dateMatch[1].trim() : "N/A";
  const region = regionMatch ? regionMatch[1].trim() : "N/A";
  const schoolCode = schoolMatch ? schoolMatch[1].trim() : "Unknown";
  const schoolName = schoolMatch ? schoolMatch[2].trim() : "CBSE Affiliated School";
  const examTitle = examTitleMatch ? examTitleMatch[1].trim() : "SENIOR SCHOOL CERTIFICATE EXAMINATION";

  interface RawParsed {
    rollNo: string;
    gender: string;
    name: string;
    subCodes: string[];
    internalGrade1: string;
    internalGrade2: string;
    internalGrade3: string;
    result: string;
    compSub: string;
    subDict: Record<string, SubjectScore>;
  }

  const rawRecords: RawParsed[] = [];
  const allSubjectCodesSet = new Set<string>();

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();
    // Match CBSE roll number record line
    // e.g.: "14727919   M SHIVAM KUSHWAHA   301 002 028 029 030 048   A1 A1 A1   PASS"
    const rollMatch = line.match(/^(\d{8})\s+([A-Z]?)\s+([MF])\s+([A-Z.\s]+?)\s+(\d{3}\s+.*)$/);
    if (rollMatch) {
      const rollNo = rollMatch[1];
      const gender = rollMatch[3];
      const name = rollMatch[4].trim().replace(/\s+/g, " ");
      const restTokens = rollMatch[5].trim().split(/\s+/);

      const subCodes: string[] = [];
      let idx = 0;
      while (idx < restTokens.length && /^\d{3}$/.test(restTokens[idx])) {
        const code = restTokens[idx];
        subCodes.push(code);
        allSubjectCodesSet.add(code);
        idx++;
      }

      const remaining = restTokens.slice(idx);
      let gr1 = "";
      let gr2 = "";
      let gr3 = "";
      let resTokens: string[] = [];

      if (remaining.length >= 4 && /^[A-E]\d$/.test(remaining[0])) {
        gr1 = remaining[0];
        gr2 = remaining[1];
        gr3 = remaining[2];
        resTokens = remaining.slice(3);
      } else {
        resTokens = remaining;
      }

      const result = resTokens.length > 0 ? resTokens[0] : "";
      const compSub = resTokens.length > 1 ? resTokens.slice(1).join(" ") : "";

      // Look at the marks line (usually the immediate next line)
      const marksLine = i + 1 < lines.length ? lines[i + 1].trim() : "";
      // Match marks and optional grade: e.g. "057 D2", "025 E", "AB"
      const pairRegex = /(\d{3}|AB|ABS)(?:\s+([A-D]\d|E\d?))?(?=\s|$)/g;
      const mksPairs: { mk: string; gr: string }[] = [];
      let matchPair: RegExpExecArray | null;
      while ((matchPair = pairRegex.exec(marksLine)) !== null) {
        mksPairs.push({
          mk: matchPair[1],
          gr: matchPair[2] || "",
        });
      }

      const subDict: Record<string, SubjectScore> = {};
      if (mksPairs.length === subCodes.length) {
        for (let s = 0; s < subCodes.length; s++) {
          const code = subCodes[s];
          const mkRaw = mksPairs[s].mk;
          const grRaw = mksPairs[s].gr;
          const isNumeric = /^\d+$/.test(mkRaw);
          const isAbsent = !isNumeric;
          const marks = isNumeric ? parseInt(mkRaw, 10) : null;
          const grade = grRaw || (isAbsent ? "AB" : "");
          subDict[code] = { marks, grade, isAbsent };
        }
      } else {
        // Handle unparsed / R.L. / Absent marks lines
        for (const code of subCodes) {
          subDict[code] = { marks: null, grade: result === "R.L." ? "R.L." : "", isAbsent: false };
        }
      }

      rawRecords.push({
        rollNo,
        gender,
        name,
        subCodes,
        internalGrade1: gr1,
        internalGrade2: gr2,
        internalGrade3: gr3,
        result,
        compSub,
        subDict,
      });

      i += 2; // Jump candidate line + marks line
    } else {
      i += 1;
    }
  }

  // Sort subject codes: Core languages (301, 302, 001, 002) first, then numerical
  const sortedSubjectCodes = Array.from(allSubjectCodesSet).sort((a, b) => {
    const isCoreA = ["301", "302", "001", "002"].includes(a) ? 0 : 1;
    const isCoreB = ["301", "302", "001", "002"].includes(b) ? 0 : 1;
    if (isCoreA !== isCoreB) return isCoreA - isCoreB;
    return a.localeCompare(b);
  });

  // Convert raw records into full CandidateRecords
  const candidates: CandidateRecord[] = rawRecords.map((rec) => {
    const subjectComboKey = rec.subCodes
      .map((c) => `${c} (${CBSE_SUBJECT_CODES[c] || `Subject ${c}`})`)
      .join(" + ");

    const numericMarks = Object.values(rec.subDict)
      .map((s) => s.marks)
      .filter((m): m is number => m !== null && !isNaN(m));

    let totalMarksAll: number | null = null;
    let percentageAll: number | null = null;
    let best5Total: number | null = null;
    let best5Percentage: number | null = null;
    let performanceBand = "Pending / R.L.";

    if (numericMarks.length > 0) {
      totalMarksAll = numericMarks.reduce((acc, v) => acc + v, 0);
      percentageAll = Number(((totalMarksAll / (numericMarks.length * 100)) * 100).toFixed(2));

      const top5 = [...numericMarks].sort((a, b) => b - a).slice(0, 5);
      best5Total = top5.reduce((acc, v) => acc + v, 0);
      best5Percentage = Number(((best5Total / (top5.length * 100)) * 100).toFixed(2));

      if (best5Percentage >= 90) {
        performanceBand = "90% & Above";
      } else if (best5Percentage >= 75) {
        performanceBand = "75% - 89.9% (Distinction)";
      } else if (best5Percentage >= 60) {
        performanceBand = "60% - 74.9%";
      } else if (best5Percentage >= 50) {
        performanceBand = "50% - 59.9%";
      } else {
        performanceBand = "Below 50%";
      }
    }

    return {
      schoolCode,
      schoolName,
      region,
      examDate,
      rollNo: rec.rollNo,
      candidateName: rec.name,
      gender: rec.gender,
      result: rec.result,
      compartmentSub: rec.compSub,
      internalGrade1: rec.internalGrade1,
      internalGrade2: rec.internalGrade2,
      internalGrade3: rec.internalGrade3,
      subjects: rec.subDict,
      subjectComboKey,
      totalMarksAll,
      percentageAll,
      best5Total,
      best5Percentage,
      rankBest5: null, // Will be computed next
      performanceBand,
    };
  });

  // Calculate Rank_Best5 using method="min" (standard competition rank, higher pct is rank 1)
  const scoredCandidates = candidates
    .filter((c) => c.best5Percentage !== null)
    .sort((a, b) => {
      const diff = (b.best5Percentage ?? 0) - (a.best5Percentage ?? 0);
      if (diff !== 0) return diff;
      return (b.totalMarksAll ?? 0) - (a.totalMarksAll ?? 0);
    });

  let currentRank = 1;
  for (let idx = 0; idx < scoredCandidates.length; idx++) {
    if (idx > 0) {
      const prev = scoredCandidates[idx - 1];
      const curr = scoredCandidates[idx];
      if (curr.best5Percentage === prev.best5Percentage) {
        curr.rankBest5 = prev.rankBest5;
      } else {
        curr.rankBest5 = idx + 1;
      }
    } else {
      scoredCandidates[0].rankBest5 = 1;
    }
  }

  // Build Subject Statistics (including Quality Index & Top 5 Students per Subject)
  const subjectStats: SubjectStat[] = sortedSubjectCodes.map((code) => {
    const subName = CBSE_SUBJECT_CODES[code] || `Subject ${code}`;
    const scores: number[] = [];
    const appearedEntries: { candidate: CandidateRecord; marks: number; grade: string }[] = [];
    const gradeCounts: Record<string, number> = {
      A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, D1: 0, D2: 0, E: 0,
    };

    let passCount = 0;

    for (const cand of candidates) {
      const subScore = cand.subjects[code];
      if (subScore && subScore.marks !== null) {
        scores.push(subScore.marks);
        appearedEntries.push({
          candidate: cand,
          marks: subScore.marks,
          grade: subScore.grade,
        });
        if (subScore.grade && STANDARD_GRADES.includes(subScore.grade as any)) {
          gradeCounts[subScore.grade] = (gradeCounts[subScore.grade] || 0) + 1;
        }
        if (subScore.grade !== "E") {
          passCount++;
        }
      }
    }

    const studentsAppeared = scores.length;
    let totalMarksSum = 0;
    let qualityIndex = 0;
    let meanMarks = 0;
    let medianMarks = 0;
    let highestMarks = 0;
    let lowestMarks = 0;
    let passPercentage = 0;

    if (studentsAppeared > 0) {
      totalMarksSum = scores.reduce((a, b) => a + b, 0);
      qualityIndex = Number((totalMarksSum / studentsAppeared).toFixed(2));
      meanMarks = qualityIndex;
      const sorted = [...scores].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      medianMarks =
        sorted.length % 2 !== 0
          ? sorted[mid]
          : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));
      highestMarks = Math.max(...scores);
      lowestMarks = Math.min(...scores);
      passPercentage = Number(((passCount / studentsAppeared) * 100).toFixed(2));
    }

    const qualityCount = (gradeCounts["A1"] || 0) + (gradeCounts["A2"] || 0);
    const qualityPercentage =
      studentsAppeared > 0 ? Number(((qualityCount / studentsAppeared) * 100).toFixed(2)) : 0;

    // Top 5 appeared students with numeric marks (deterministic tie-breaking)
    const sortedEntries = [...appearedEntries].sort((a, b) => {
      if (b.marks !== a.marks) return b.marks - a.marks;
      const b5Diff = (b.candidate.best5Percentage ?? -1) - (a.candidate.best5Percentage ?? -1);
      if (b5Diff !== 0) return b5Diff;
      const totDiff = (b.candidate.totalMarksAll ?? -1) - (a.candidate.totalMarksAll ?? -1);
      if (totDiff !== 0) return totDiff;
      return a.candidate.rollNo.localeCompare(b.candidate.rollNo);
    });

    const topStudents: SubjectTopper[] = [];
    for (let idx = 0; idx < Math.min(5, sortedEntries.length); idx++) {
      const entry = sortedEntries[idx];
      const rank =
        idx > 0 && entry.marks === sortedEntries[idx - 1].marks
          ? topStudents[idx - 1].rank
          : idx + 1;
      topStudents.push({
        rank,
        candidate: entry.candidate,
        marks: entry.marks,
        grade: entry.grade,
      });
    }

    return {
      subjectCode: code,
      subjectName: subName,
      studentsAppeared,
      totalMarksSum,
      qualityIndex,
      meanMarks,
      medianMarks,
      highestMarks,
      lowestMarks,
      passCount,
      passPercentage,
      gradeCounts,
      qualityCount,
      qualityPercentage,
      topStudents,
    };
  }).filter((s) => s.studentsAppeared > 0);

  // Build Overall Summary
  const totalCandidates = candidates.length;
  const resultBreakdown: Record<string, number> = {};
  for (const c of candidates) {
    const res = c.result || "UNKNOWN";
    resultBreakdown[res] = (resultBreakdown[res] || 0) + 1;
  }

  const passedCandidates = candidates.filter((c) => c.result === "PASS" && c.best5Percentage !== null);
  const passCount = resultBreakdown["PASS"] || 0;
  const passPercentage =
    totalCandidates > 0 ? Number(((passCount / totalCandidates) * 100).toFixed(2)) : 0;
  const compartmentCount = resultBreakdown["COMP"] || 0;
  const resultLaterCount = resultBreakdown["R.L."] || 0;

  let meanBest5 = 0;
  let medianBest5 = 0;
  let highestBest5 = 0;
  let lowestBest5 = 0;

  if (passedCandidates.length > 0) {
    const pcts = passedCandidates.map((c) => c.best5Percentage as number);
    const sum = pcts.reduce((a, b) => a + b, 0);
    meanBest5 = Number((sum / pcts.length).toFixed(2));

    const sortedPcts = [...pcts].sort((a, b) => a - b);
    const mid = Math.floor(sortedPcts.length / 2);
    medianBest5 =
      sortedPcts.length % 2 !== 0
        ? sortedPcts[mid]
        : Number(((sortedPcts[mid - 1] + sortedPcts[mid]) / 2).toFixed(2));

    highestBest5 = Math.max(...pcts);
    lowestBest5 = Math.min(...pcts);
  }

  // Performance bands definition
  const bandDefs: {
    label: string;
    minPct: number;
    maxPct: number;
    colorClass: string;
    badgeBg: string;
  }[] = [
    { label: "90% & Above", minPct: 90, maxPct: 100, colorClass: "text-emerald-700 bg-emerald-50", badgeBg: "bg-emerald-600" },
    { label: "75% - 89.9% (Distinction)", minPct: 75, maxPct: 89.99, colorClass: "text-blue-700 bg-blue-50", badgeBg: "bg-blue-600" },
    { label: "60% - 74.9%", minPct: 60, maxPct: 74.99, colorClass: "text-indigo-700 bg-indigo-50", badgeBg: "bg-indigo-600" },
    { label: "50% - 59.9%", minPct: 50, maxPct: 59.99, colorClass: "text-amber-700 bg-amber-50", badgeBg: "bg-amber-600" },
    { label: "Below 50%", minPct: 0, maxPct: 49.99, colorClass: "text-rose-700 bg-rose-50", badgeBg: "bg-rose-600" },
  ];

  const performanceBands: PerformanceBandCount[] = bandDefs.map((def) => {
    const count = passedCandidates.filter(
      (c) => (c.best5Percentage as number) >= def.minPct && (c.best5Percentage as number) <= def.maxPct
    ).length;
    const percentage =
      passedCandidates.length > 0 ? Number(((count / passedCandidates.length) * 100).toFixed(1)) : 0;
    return {
      label: def.label,
      count,
      percentage,
      minPct: def.minPct,
      maxPct: def.maxPct,
      colorClass: def.colorClass,
      badgeBg: def.badgeBg,
    };
  });

  const distinctionCount = passedCandidates.filter((c) => (c.best5Percentage as number) >= 75).length;
  const distinctionPercentage =
    passedCandidates.length > 0 ? Number(((distinctionCount / passedCandidates.length) * 100).toFixed(2)) : 0;
  const ninetyPlusCount = passedCandidates.filter((c) => (c.best5Percentage as number) >= 90).length;

  // Overall Grade Distribution across all subjects taken
  const overallGradeCounts: Record<string, number> = {};
  for (const g of STANDARD_GRADES) overallGradeCounts[g] = 0;
  let totalGradesAwarded = 0;

  for (const cand of candidates) {
    for (const sub of Object.values(cand.subjects)) {
      if (sub.grade && STANDARD_GRADES.includes(sub.grade as any)) {
        overallGradeCounts[sub.grade] = (overallGradeCounts[sub.grade] || 0) + 1;
        totalGradesAwarded++;
      }
    }
  }

  const overallGradeDistribution = STANDARD_GRADES.map((grade) => {
    const count = overallGradeCounts[grade] || 0;
    const percentage =
      totalGradesAwarded > 0 ? Number(((count / totalGradesAwarded) * 100).toFixed(1)) : 0;
    return { grade, count, percentage };
  });

  // Top 5 Performers
  const topPerformers = [...passedCandidates]
    .sort((a, b) => {
      const diff = (b.best5Percentage ?? 0) - (a.best5Percentage ?? 0);
      if (diff !== 0) return diff;
      return (b.totalMarksAll ?? 0) - (a.totalMarksAll ?? 0);
    })
    .slice(0, 5);

  // Automated Academic Insights
  const insights: AcademicInsight[] = [];

  // Pass rate insight
  insights.push({
    type: passPercentage >= 95 ? "positive" : passPercentage >= 80 ? "neutral" : "warning",
    title: "Institutional Pass Rate",
    description: `${passCount} of ${totalCandidates} candidates (${passPercentage}%) successfully cleared the examination.${
      resultLaterCount > 0 ? ` Note: ${resultLaterCount} candidate(s) currently recorded under R.L. (Result Later).` : ""
    }${compartmentCount > 0 ? ` ${compartmentCount} candidate(s) placed in Compartment.` : ""}`,
  });

  // Distinction cohort
  if (distinctionCount > 0) {
    insights.push({
      type: "highlight",
      title: "Distinction Achievement (≥75% Best-5)",
      description: `${distinctionCount} students (${distinctionPercentage}% of passed cohort) achieved Distinction standards, with ${ninetyPlusCount} student(s) crossing the prestigious 90% benchmark.`,
    });
  }

  // Strongest subject by mean
  if (subjectStats.length > 0) {
    const sortedByMean = [...subjectStats].sort((a, b) => b.meanMarks - a.meanMarks);
    const topSub = sortedByMean[0];
    const lowSub = sortedByMean[sortedByMean.length - 1];

    insights.push({
      type: "positive",
      title: `Highest Average: ${topSub.subjectName} (${topSub.subjectCode})`,
      description: `Delivered the cohort's strongest mean score of ${topSub.meanMarks} across ${topSub.studentsAppeared} enrolled students, with a peak mark of ${topSub.highestMarks} and ${topSub.qualityCount} A1/A2 grades (${topSub.qualityPercentage}%).`,
    });

    if (subjectStats.length > 1 && lowSub.meanMarks < topSub.meanMarks) {
      insights.push({
        type: "neutral",
        title: `Curriculum Attention: ${lowSub.subjectName} (${lowSub.subjectCode})`,
        description: `Recorded the lowest subject mean of ${lowSub.meanMarks} with ${lowSub.passPercentage}% pass rate (lowest mark: ${lowSub.lowestMarks}, highest: ${lowSub.highestMarks}). Recommended focus area for departmental review.`,
      });
    }
  }

  const summary: OverallSummary = {
    totalCandidates,
    resultBreakdown,
    passCount,
    passPercentage,
    compartmentCount,
    resultLaterCount,
    meanBest5,
    medianBest5,
    highestBest5,
    lowestBest5,
    distinctionCount,
    distinctionPercentage,
    ninetyPlusCount,
    performanceBands,
    overallGradeDistribution,
    topPerformers,
    insights,
  };

  return {
    fileName,
    schoolCode,
    schoolName,
    region,
    examDate,
    examTitle,
    candidates,
    sortedSubjectCodes,
    subjectStats,
    summary,
  };
}
