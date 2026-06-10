import { useEffect, useMemo, useState } from "react";
import {
  scoreFor,
  isCorrect,
  TOPICS,
  TEST_DURATION_SECONDS,
  type Question,
  type Topic,
} from "@/lib/test-config";
import { useTestStore } from "@/store/testStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MathText } from "@/components/test/MathText";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Download, RotateCcw, Home } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cn } from "@/lib/utils";

const COLORS = ["#10b981", "#ef4444", "#94a3b8"];

export function ResultView() {
  const navigate = useNavigate();
  const { submitted, questions, answers, remaining, resetTest } = useTestStore();
  const [filter, setFilter] = useState<"all" | "correct" | "wrong" | "skipped">("all");
  const [topic, setTopic] = useState<string>("All");

  const stats = useMemo(() => computeStats(questions, answers), [questions, answers]);
  const timeSpent = TEST_DURATION_SECONDS - remaining;

  useEffect(() => {
    if (!submitted) navigate({ to: "/" });
  }, [submitted, navigate]);

  if (!submitted) return null;

  const filteredQs = questions.filter((q) => {
    if (topic !== "All" && q.topic !== topic) return false;
    const a = answers[q.id];
    const has = hasVal(a?.value);
    if (filter === "skipped") return !has;
    if (filter === "correct") return has && isCorrect(q, a);
    if (filter === "wrong") return has && !isCorrect(q, a);
    return true;
  });

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-3xl font-bold">Result &amp; Analysis</h1>
            <p className="text-sm text-muted-foreground">
              GATE CSE Full-Length Mock Test
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/" })}>
              <Home className="h-4 w-4" /> Home
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm("Reset progress and return home?")) {
                  resetTest();
                  navigate({ to: "/" });
                }
              }}
            >
              <RotateCcw className="h-4 w-4" /> New Attempt
            </Button>
            <Button onClick={() => downloadPdf(questions, answers, stats, timeSpent)}>
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Score" value={`${stats.score.toFixed(2)} / ${stats.maxScore}`} />
          <StatCard label="Accuracy" value={`${stats.accuracy.toFixed(1)}%`} />
          <StatCard
            label="Attempted"
            value={`${stats.attempted} / ${questions.length}`}
          />
          <StatCard label="Time Used" value={fmtMs(timeSpent)} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">Overall</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Correct", value: stats.correct },
                    { name: "Wrong", value: stats.wrong },
                    { name: "Skipped", value: stats.skipped },
                  ]}
                  dataKey="value"
                  outerRadius={90}
                  label
                >
                  {COLORS.map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">Topic-wise score</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.topicRows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="topic" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={70} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" name="Score" fill="#10b981" />
                <Bar dataKey="max" name="Max" fill="#94a3b8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 font-semibold">Topic-wise breakdown</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-2">Topic</th>
                  <th className="p-2">Attempted</th>
                  <th className="p-2">Correct</th>
                  <th className="p-2">Wrong</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Accuracy</th>
                  <th className="p-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.topicRows.map((r) => (
                  <tr key={r.topic} className="border-t">
                    <td className="p-2 font-medium">{r.topic}</td>
                    <td className="p-2">{r.attempted}/{r.total}</td>
                    <td className="p-2 text-emerald-600">{r.correct}</td>
                    <td className="p-2 text-rose-600">{r.wrong}</td>
                    <td className="p-2">{r.score.toFixed(2)}/{r.max}</td>
                    <td className="p-2">{r.attempted ? ((r.correct / r.attempted) * 100).toFixed(0) : 0}%</td>
                    <td className="p-2">{fmtMs(r.time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">Detailed Review</h3>
            <div className="flex flex-wrap gap-2">
              <select
                className="rounded border bg-background px-2 py-1 text-sm"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="All">All topics</option>
                {TOPICS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <div className="flex gap-1">
                {(["all", "correct", "wrong", "skipped"] as const).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? "default" : "outline"}
                    onClick={() => setFilter(f)}
                  >
                    {f[0].toUpperCase() + f.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-auto">
            {filteredQs.map((q, idx) => (
              <ReviewCard key={q.id} q={q} ans={answers[q.id]} idx={questions.indexOf(q)} num={idx + 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function ReviewCard({
  q,
  ans,
  num,
}: {
  q: Question;
  ans: { value: number | number[] | string | null; timeSpent: number } | undefined;
  idx: number;
  num: number;
}) {
  const has = hasVal(ans?.value);
  const correct = has && isCorrect(q, ans!);
  const status = !has ? "Skipped" : correct ? "Correct" : "Wrong";
  return (
    <div className={cn("rounded border p-3", correct && "border-emerald-300", !correct && has && "border-rose-300")}>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline">Q{num}</Badge>
        <Badge>{q.topic}</Badge>
        <Badge variant="secondary">{q.type} • {q.marks}m</Badge>
        <Badge
          className={cn(
            correct && "bg-emerald-500",
            !correct && has && "bg-rose-500",
            !has && "bg-slate-400",
          )}
        >
          {status}
        </Badge>
        <span className="text-muted-foreground ml-auto">Time: {fmtMs(ans?.timeSpent ?? 0)}</span>
      </div>
      <div className="text-sm"><MathText>{q.text}</MathText></div>
      <div className="mt-2 text-xs text-muted-foreground">
        Your answer: <span className="text-foreground">{formatAns(q, ans?.value)}</span>
        {" • "}Correct: <span className="text-foreground">{formatCorrect(q)}</span>
        {" • "}Score: <span className="text-foreground">{ans ? scoreFor(q, ans).toFixed(2) : "0"}</span>
      </div>
      {q.explanation && (
        <div className="mt-2 rounded bg-muted/50 p-2 text-xs">
          <b>Explanation:</b> <MathText>{q.explanation}</MathText>
        </div>
      )}
    </div>
  );
}

function hasVal(v: unknown) {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim() !== "";
  return true;
}

function formatAns(q: Question, v: unknown): string {
  if (!hasVal(v)) return "—";
  if (q.type === "MCQ") return `${String.fromCharCode(65 + (v as number))}`;
  if (q.type === "MSQ") return (v as number[]).map((i) => String.fromCharCode(65 + i)).join(", ");
  return String(v);
}
function formatCorrect(q: Question): string {
  if (q.type === "MCQ") return String.fromCharCode(65 + (q.answer as number));
  if (q.type === "MSQ") return (q.answer as number[]).map((i) => String.fromCharCode(65 + i)).join(", ");
  const [a, b] = q.answer as [number, number];
  return a === b ? String(a) : `${a} – ${b}`;
}

function fmtMs(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

interface Stats {
  score: number;
  maxScore: number;
  correct: number;
  wrong: number;
  skipped: number;
  attempted: number;
  accuracy: number;
  topicRows: Array<{
    topic: Topic;
    total: number;
    attempted: number;
    correct: number;
    wrong: number;
    score: number;
    max: number;
    time: number;
  }>;
}

function computeStats(
  questions: Question[],
  answers: Record<string, { value: number | number[] | string | null; timeSpent: number }>,
): Stats {
  let score = 0,
    maxScore = 0,
    correct = 0,
    wrong = 0,
    skipped = 0;
  const topicMap = new Map<Topic, Stats["topicRows"][number]>();
  for (const t of TOPICS) {
    topicMap.set(t, { topic: t, total: 0, attempted: 0, correct: 0, wrong: 0, score: 0, max: 0, time: 0 });
  }
  for (const q of questions) {
    const a = answers[q.id] ?? { value: null, timeSpent: 0 };
    maxScore += q.marks;
    const has = hasVal(a.value);
    const sc = scoreFor(q, a);
    score += sc;
    const row = topicMap.get(q.topic)!;
    row.total++;
    row.max += q.marks;
    row.score += sc;
    row.time += a.timeSpent;
    if (has) {
      row.attempted++;
      if (isCorrect(q, a)) {
        correct++;
        row.correct++;
      } else {
        wrong++;
        row.wrong++;
      }
    } else {
      skipped++;
    }
  }
  const attempted = correct + wrong;
  const accuracy = attempted === 0 ? 0 : (correct / attempted) * 100;
  return {
    score,
    maxScore,
    correct,
    wrong,
    skipped,
    attempted,
    accuracy,
    topicRows: [...topicMap.values()],
  };
}

function downloadPdf(
  questions: Question[],
  answers: Record<string, { value: number | number[] | string | null; timeSpent: number }>,
  stats: Stats,
  timeSpent: number,
) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("GATE CSE Mock Test — Performance Report", 14, 18);
  doc.setFontSize(11);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);

  autoTable(doc, {
    startY: 32,
    head: [["Metric", "Value"]],
    body: [
      ["Score", `${stats.score.toFixed(2)} / ${stats.maxScore}`],
      ["Accuracy", `${stats.accuracy.toFixed(1)}%`],
      ["Attempted", `${stats.attempted} / ${questions.length}`],
      ["Correct", String(stats.correct)],
      ["Wrong", String(stats.wrong)],
      ["Skipped", String(stats.skipped)],
      ["Time used", fmtMs(timeSpent)],
    ],
  });

  autoTable(doc, {
    head: [["Topic", "Attempted", "Correct", "Wrong", "Score", "Time"]],
    body: stats.topicRows.map((r) => [
      r.topic,
      `${r.attempted}/${r.total}`,
      String(r.correct),
      String(r.wrong),
      `${r.score.toFixed(2)}/${r.max}`,
      fmtMs(r.time),
    ]),
  });

  autoTable(doc, {
    head: [["#", "Topic", "Type", "Marks", "Your", "Correct", "Score", "Time"]],
    body: questions.map((q, i) => {
      const a = answers[q.id] ?? { value: null, timeSpent: 0 };
      return [
        String(i + 1),
        q.topic,
        q.type,
        String(q.marks),
        formatAns(q, a.value),
        formatCorrect(q),
        scoreFor(q, a).toFixed(2),
        fmtMs(a.timeSpent),
      ];
    }),
    styles: { fontSize: 8 },
  });

  doc.save(`GATE_CSE_Mock_Report_${Date.now()}.pdf`);
}
