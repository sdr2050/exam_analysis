/**
 * CBSE Exam Result Analysis Data Types & Structures
 */

export const CBSE_SUBJECT_CODES: Record<string, string> = {
  "001": "English Elective",
  "002": "Hindi Elective",
  "027": "History",
  "028": "Political Science",
  "029": "Geography",
  "030": "Economics",
  "037": "Psychology",
  "039": "Sociology",
  "041": "Mathematics",
  "042": "Physics",
  "043": "Chemistry",
  "044": "Biology",
  "048": "Physical Education",
  "049": "Painting",
  "054": "Business Studies",
  "055": "Accountancy",
  "064": "Home Science",
  "065": "Informatics Practices",
  "083": "Computer Science",
  "241": "Applied Mathematics",
  "301": "English Core",
  "302": "Hindi Core",
  "322": "Sanskrit Core",
};

export const STANDARD_GRADES = ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2", "E"] as const;
export type GradeType = typeof STANDARD_GRADES[number];

export interface SubjectScore {
  marks: number | null;
  grade: string;
  isAbsent: boolean;
}

export interface CandidateRecord {
  schoolCode: string;
  schoolName: string;
  region: string;
  examDate: string;
  rollNo: string;
  candidateName: string;
  gender: string;
  result: string;
  compartmentSub: string;
  internalGrade1: string;
  internalGrade2: string;
  internalGrade3: string;
  subjects: Record<string, SubjectScore>;
  subjectComboKey: string;
  totalMarksAll: number | null;
  percentageAll: number | null;
  best5Total: number | null;
  best5Percentage: number | null;
  rankBest5: number | null;
  performanceBand: string;
}

export interface SubjectTopper {
  rank: number;
  candidate: CandidateRecord;
  marks: number;
  grade: string;
}

export interface SubjectStat {
  subjectCode: string;
  subjectName: string;
  studentsAppeared: number;
  totalMarksSum: number;
  qualityIndex: number; // totalMarksSum / studentsAppeared
  meanMarks: number;
  medianMarks: number;
  highestMarks: number;
  lowestMarks: number;
  passCount: number;
  passPercentage: number;
  gradeCounts: Record<string, number>;
  qualityCount: number; // A1 + A2 count
  qualityPercentage: number; // (A1 + A2) / studentsAppeared
  topStudents: SubjectTopper[];
}

export interface PerformanceBandCount {
  label: string;
  count: number;
  percentage: number;
  minPct: number;
  maxPct: number;
  colorClass: string;
  badgeBg: string;
}

export interface AcademicInsight {
  type: "positive" | "warning" | "neutral" | "highlight";
  title: string;
  description: string;
}

export interface OverallSummary {
  totalCandidates: number;
  resultBreakdown: Record<string, number>;
  passCount: number;
  passPercentage: number;
  compartmentCount: number;
  resultLaterCount: number;
  meanBest5: number;
  medianBest5: number;
  highestBest5: number;
  lowestBest5: number;
  distinctionCount: number; // Best 5 >= 75%
  distinctionPercentage: number;
  ninetyPlusCount: number; // Best 5 >= 90%
  performanceBands: PerformanceBandCount[];
  overallGradeDistribution: { grade: string; count: number; percentage: number }[];
  topPerformers: CandidateRecord[];
  insights: AcademicInsight[];
}

export interface ParsedGazette {
  fileName: string;
  schoolCode: string;
  schoolName: string;
  region: string;
  examDate: string;
  examTitle: string;
  candidates: CandidateRecord[];
  sortedSubjectCodes: string[];
  subjectStats: SubjectStat[];
  summary: OverallSummary;
}

export interface CustomFilterState {
  searchQuery: string;
  results: string[]; // empty array means ALL statuses
  gender: string;
  performanceBand: string;
  subjectCode: string;
  subjectGrade: string;
  minMarks: string;
  maxMarks: string;
  minBest5: string;
  maxBest5: string;
  internalGrade1: string;
}

export type PivotRowDimension =
  | "subject"
  | "performanceBand"
  | "result"
  | "gender"
  | "subjectCombo"
  | "internalGrade1";

export type PivotColDimension =
  | "none"
  | "grade"
  | "performanceBand"
  | "result"
  | "gender";

export type PivotMetric =
  | "count"
  | "meanBest5"
  | "medianBest5"
  | "highestBest5"
  | "lowestBest5"
  | "passRate"
  | "qualityRate";

export type PivotDistinctionFilter = "all" | "distinction" | "below_distinction";

export interface PivotMatrixCell {
  value: number | null;
  formatted: string;
  sampleCount: number;
}

export interface PivotMatrixRow {
  label: string;
  values: Record<string, PivotMatrixCell>;
  total: PivotMatrixCell;
}

export interface PivotMatrixResult {
  rowDimension: PivotRowDimension;
  colDimension: PivotColDimension;
  metric: PivotMetric;
  colHeaders: string[];
  rows: PivotMatrixRow[];
  overallTotal: PivotMatrixCell;
}
