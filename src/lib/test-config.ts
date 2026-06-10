export const TOPICS = [
  "Algorithms",
  "Data Structures",
  "C Programming",
  "Compiler Design",
  "Theory of Computation",
  "Operating Systems",
  "Computer Networks",
  "Computer Organization",
  "DBMS",
  "Discrete Mathematics",
  "Probability",
  "Digital Logic",
  "Engineering Mathematics",
  "Aptitude",
] as const;

export type Topic = (typeof TOPICS)[number];

export const TEST_DURATION_SECONDS = 180 * 60; // 3 hours
export const AUTOSAVE_INTERVAL_MS = 15_000;
export const MAX_WARNINGS = 3;
export const STORAGE_KEY = "gate-cse-mock-v1";

export type QType = "MCQ" | "MSQ" | "NAT";

export interface Question {
  id: string;
  topic: Topic;
  marks: 1 | 2;
  type: QType;
  text: string;
  options?: string[];
  /** index for MCQ, indices for MSQ, [min,max] for NAT */
  answer: number | number[] | [number, number];
  explanation?: string;
}

export type QStatus =
  | "not-visited"
  | "not-answered"
  | "answered"
  | "marked"
  | "answered-marked";

export interface Answer {
  // MCQ: number | null, MSQ: number[], NAT: string
  value: number | number[] | string | null;
  timeSpent: number; // seconds
}

export function scoreFor(q: Question, ans: Answer): number {
  if (ans.value == null || ans.value === "" || (Array.isArray(ans.value) && ans.value.length === 0))
    return 0;
  if (q.type === "MCQ") {
    const correct = ans.value === q.answer;
    if (correct) return q.marks;
    return q.marks === 1 ? -1 / 3 : -2 / 3;
  }
  if (q.type === "MSQ") {
    const a = [...(ans.value as number[])].sort();
    const b = [...(q.answer as number[])].sort();
    return a.length === b.length && a.every((v, i) => v === b[i]) ? q.marks : 0;
  }
  // NAT
  const v = parseFloat(ans.value as string);
  if (Number.isNaN(v)) return 0;
  const [min, max] = q.answer as [number, number];
  return v >= min && v <= max ? q.marks : 0;
}

export function isCorrect(q: Question, ans: Answer): boolean {
  return scoreFor(q, ans) > 0;
}
