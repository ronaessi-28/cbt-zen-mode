import { TOPICS, type Question, type QType, type Topic } from "@/lib/test-config";
import raw from "./questions.json";

// Validate at runtime; provide stable order: per-topic, 1-mark first then 2-mark.
const all = raw as Question[];

export function getQuestions(): Question[] {
  const byTopic: Record<Topic, Question[]> = Object.fromEntries(
    TOPICS.map((t) => [t, [] as Question[]]),
  ) as Record<Topic, Question[]>;
  for (const q of all) {
    if (byTopic[q.topic]) byTopic[q.topic].push(q);
  }
  const ordered: Question[] = [];
  for (const t of TOPICS) {
    const ones = byTopic[t].filter((q) => q.marks === 1);
    const twos = byTopic[t].filter((q) => q.marks === 2);
    ordered.push(...ones, ...twos);
  }
  return ordered;
}

export const QUESTION_TYPES: QType[] = ["MCQ", "MSQ", "NAT"];
