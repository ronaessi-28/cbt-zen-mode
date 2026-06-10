import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AUTOSAVE_INTERVAL_MS,
  MAX_WARNINGS,
  STORAGE_KEY,
  TEST_DURATION_SECONDS,
  type Answer,
  type QStatus,
  type Question,
} from "@/lib/test-config";
import { getQuestions } from "@/data/questions";

interface TestState {
  started: boolean;
  submitted: boolean;
  startedAt: number | null;
  submittedAt: number | null;
  remaining: number; // seconds
  currentIdx: number;
  questions: Question[];
  answers: Record<string, Answer>;
  statuses: Record<string, QStatus>;
  bookmarks: Record<string, boolean>;
  warnings: number;
  // actions
  startTest: () => void;
  resetTest: () => void;
  submitTest: () => void;
  goTo: (idx: number) => void;
  setAnswer: (id: string, value: Answer["value"]) => void;
  clearAnswer: (id: string) => void;
  markForReview: (id: string, withAnswer?: boolean) => void;
  toggleBookmark: (id: string) => void;
  tick: (delta: number) => void;
  registerWarning: () => number; // returns warnings count after
  accumulateTime: (id: string, secs: number) => void;
}

function initialState(): Pick<
  TestState,
  | "started"
  | "submitted"
  | "startedAt"
  | "submittedAt"
  | "remaining"
  | "currentIdx"
  | "questions"
  | "answers"
  | "statuses"
  | "bookmarks"
  | "warnings"
> {
  const qs = getQuestions();
  const answers: Record<string, Answer> = {};
  const statuses: Record<string, QStatus> = {};
  for (const q of qs) {
    answers[q.id] = { value: q.type === "MSQ" ? [] : null, timeSpent: 0 };
    statuses[q.id] = "not-visited";
  }
  return {
    started: false,
    submitted: false,
    startedAt: null,
    submittedAt: null,
    remaining: TEST_DURATION_SECONDS,
    currentIdx: 0,
    questions: qs,
    answers,
    statuses,
    bookmarks: {},
    warnings: 0,
  };
}

function hasAnswerValue(v: Answer["value"]): boolean {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim() !== "";
  return true;
}

export const useTestStore = create<TestState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      startTest: () => {
        const s = get();
        if (s.started && !s.submitted) return;
        set({
          ...initialState(),
          started: true,
          startedAt: Date.now(),
          statuses: (() => {
            const map = { ...initialState().statuses };
            const first = get().questions[0] ?? getQuestions()[0];
            if (first) map[first.id] = "not-answered";
            return map;
          })(),
        });
        // ensure first question visited status
        const q0 = get().questions[0];
        if (q0) {
          set((st) => ({ statuses: { ...st.statuses, [q0.id]: "not-answered" } }));
        }
      },

      resetTest: () => set({ ...initialState() }),

      submitTest: () => {
        if (get().submitted) return;
        set({ submitted: true, submittedAt: Date.now() });
      },

      goTo: (idx) => {
        const { questions, statuses } = get();
        if (idx < 0 || idx >= questions.length) return;
        const q = questions[idx];
        const cur = statuses[q.id];
        const next: QStatus = cur === "not-visited" ? "not-answered" : cur;
        set({ currentIdx: idx, statuses: { ...statuses, [q.id]: next } });
      },

      setAnswer: (id, value) => {
        const { answers, statuses } = get();
        const prev = answers[id] ?? { value: null, timeSpent: 0 };
        const newAns: Answer = { ...prev, value };
        const has = hasAnswerValue(value);
        const wasMarked = statuses[id] === "marked" || statuses[id] === "answered-marked";
        const newStatus: QStatus = has
          ? wasMarked
            ? "answered-marked"
            : "answered"
          : wasMarked
            ? "marked"
            : "not-answered";
        set({
          answers: { ...answers, [id]: newAns },
          statuses: { ...statuses, [id]: newStatus },
        });
      },

      clearAnswer: (id) => {
        const { answers, statuses, questions } = get();
        const q = questions.find((x) => x.id === id);
        const empty: Answer["value"] = q?.type === "MSQ" ? [] : null;
        const wasMarked = statuses[id] === "marked" || statuses[id] === "answered-marked";
        set({
          answers: { ...answers, [id]: { ...answers[id], value: empty } },
          statuses: { ...statuses, [id]: wasMarked ? "marked" : "not-answered" },
        });
      },

      markForReview: (id) => {
        const { answers, statuses } = get();
        const has = hasAnswerValue(answers[id]?.value ?? null);
        set({
          statuses: {
            ...statuses,
            [id]: has ? "answered-marked" : "marked",
          },
        });
      },

      toggleBookmark: (id) => {
        const { bookmarks } = get();
        set({ bookmarks: { ...bookmarks, [id]: !bookmarks[id] } });
      },

      tick: (delta) => {
        const s = get();
        if (!s.started || s.submitted) return;
        const next = Math.max(0, s.remaining - delta);
        set({ remaining: next });
        if (next === 0) set({ submitted: true, submittedAt: Date.now() });
      },

      registerWarning: () => {
        const s = get();
        if (!s.started || s.submitted) return s.warnings;
        const w = s.warnings + 1;
        set({ warnings: w });
        if (w >= MAX_WARNINGS) {
          set({ submitted: true, submittedAt: Date.now() });
        }
        return w;
      },

      accumulateTime: (id, secs) => {
        const { answers } = get();
        const prev = answers[id] ?? { value: null, timeSpent: 0 };
        set({
          answers: {
            ...answers,
            [id]: { ...prev, timeSpent: prev.timeSpent + secs },
          },
        });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        started: s.started,
        submitted: s.submitted,
        startedAt: s.startedAt,
        submittedAt: s.submittedAt,
        remaining: s.remaining,
        currentIdx: s.currentIdx,
        answers: s.answers,
        statuses: s.statuses,
        bookmarks: s.bookmarks,
        warnings: s.warnings,
      }),
    },
  ),
);

export { AUTOSAVE_INTERVAL_MS };
