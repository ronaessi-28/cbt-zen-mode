import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTestStore } from "@/store/testStore";
import {
  AUTOSAVE_INTERVAL_MS,
  TOPICS,
  type QStatus,
  type Question,
} from "@/lib/test-config";
import { MathText } from "./MathText";
import { AntiCheat } from "./AntiCheat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Bookmark,
  BookmarkCheck,
  Clock,
  Flag,
  Maximize,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function statusClasses(s: QStatus, active: boolean): string {
  const base = "h-9 w-9 rounded text-xs font-semibold flex items-center justify-center transition-all";
  const ring = active ? "ring-2 ring-offset-1 ring-foreground" : "";
  const color = {
    "not-visited": "bg-muted text-muted-foreground border border-border",
    "not-answered": "bg-rose-500 text-white",
    answered: "bg-emerald-500 text-white",
    marked: "bg-violet-500 text-white",
    "answered-marked": "bg-violet-500 text-white relative after:content-[''] after:absolute after:bottom-0.5 after:right-0.5 after:h-2 after:w-2 after:rounded-full after:bg-emerald-400",
  }[s];
  return cn(base, color, ring);
}

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function TestRunner() {
  const navigate = useNavigate();
  const {
    started,
    submitted,
    questions,
    currentIdx,
    answers,
    statuses,
    bookmarks,
    remaining,
    tick,
    goTo,
    setAnswer,
    clearAnswer,
    markForReview,
    toggleBookmark,
    submitTest,
    accumulateTime,
  } = useTestStore();

  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("All");
  const lastTickRef = useRef<number>(Date.now());
  const qStartRef = useRef<number>(Date.now());

  const current = questions[currentIdx];

  // tick timer every second
  useEffect(() => {
    if (!started || submitted) return;
    const id = setInterval(() => {
      const now = Date.now();
      const delta = Math.round((now - lastTickRef.current) / 1000);
      if (delta > 0) {
        lastTickRef.current = now;
        tick(delta);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [started, submitted, tick]);

  // autosave heartbeat (zustand persist already saves on every change; this just nudges)
  useEffect(() => {
    if (!started || submitted) return;
    const id = setInterval(() => {
      // trigger persist by reading state (persist writes on every set; ensure remaining flushed)
      useTestStore.setState({});
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [started, submitted]);

  // track time per question
  useEffect(() => {
    qStartRef.current = Date.now();
    return () => {
      if (!current) return;
      const secs = Math.round((Date.now() - qStartRef.current) / 1000);
      if (secs > 0) accumulateTime(current.id, secs);
    };
  }, [currentIdx, current, accumulateTime]);

  // auto-redirect when submitted
  useEffect(() => {
    if (submitted) {
      // flush current question time
      if (current) {
        const secs = Math.round((Date.now() - qStartRef.current) / 1000);
        if (secs > 0) accumulateTime(current.id, secs);
      }
      navigate({ to: "/result" });
    }
  }, [submitted, navigate, current, accumulateTime]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return questions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => topicFilter === "All" || q.topic === topicFilter)
      .filter(({ q }) =>
        s === "" ? true : q.text.toLowerCase().includes(s) || q.id.includes(s),
      );
  }, [questions, search, topicFilter]);

  if (!started) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md text-center">
          <p>No active test. Return home to start.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/" })}>
            Home
          </Button>
        </div>
      </div>
    );
  }
  if (!current) return null;

  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = () => {
    if (!confirm("Submit the test now? This cannot be undone.")) return;
    submitTest();
  };

  return (
    <div className="min-h-screen bg-background select-none">
      <AntiCheat enabled />
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="flex items-center justify-between gap-3 px-4 py-2">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold">GATE CSE Mock Test</h1>
            <Badge variant="outline">280 Q • 420 marks</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={remaining < 600 ? "destructive" : "secondary"}
              className="gap-1 text-base font-mono px-3 py-1"
            >
              <Clock className="h-4 w-4" /> {fmt(remaining)}
            </Badge>
            <Button size="sm" variant="outline" onClick={enterFullscreen} title="Fullscreen">
              <Maximize className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="destructive" onClick={handleSubmit}>
              Submit
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 p-4">
        {/* Question panel */}
        <main className="rounded-lg border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge>{current.topic}</Badge>
              <Badge variant="outline">{current.type}</Badge>
              <Badge variant="secondary">{current.marks} mark{current.marks > 1 ? "s" : ""}</Badge>
              <span className="text-sm text-muted-foreground">
                Q {currentIdx + 1} of {questions.length}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                toggleBookmark(current.id);
                toast.success(bookmarks[current.id] ? "Bookmark removed" : "Bookmarked");
              }}
              title="Bookmark"
            >
              {bookmarks[current.id] ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </Button>
          </div>

          <div className="mb-6 text-base leading-relaxed">
            <MathText>{current.text}</MathText>
          </div>

          <AnswerInput q={current} value={answers[current.id]?.value ?? null} onChange={(v) => setAnswer(current.id, v)} />

          <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => goTo(currentIdx - 1)} disabled={currentIdx === 0}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button variant="outline" onClick={() => goTo(currentIdx + 1)} disabled={currentIdx === questions.length - 1}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => clearAnswer(current.id)}>
                Clear Response
              </Button>
              <Button variant="secondary" onClick={() => markForReview(current.id)}>
                <Flag className="h-4 w-4" /> Mark for Review
              </Button>
              <Button onClick={() => goTo(currentIdx + 1)} disabled={currentIdx === questions.length - 1}>
                Save & Next
              </Button>
            </div>
          </div>
        </main>

        {/* Palette */}
        <aside className="rounded-lg border bg-card p-4 max-h-[calc(100vh-110px)] overflow-auto">
          <Legend />
          <div className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder="Search question..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <select
            className="mt-2 w-full rounded border bg-background px-2 py-1 text-sm"
            value={topicFilter}
            onChange={(e) => setTopicFilter(e.target.value)}
          >
            <option value="All">All topics</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {filtered.map(({ q, i }) => (
              <button
                key={q.id}
                onClick={() => goTo(i)}
                className={statusClasses(statuses[q.id], i === currentIdx)}
                title={`Q${i + 1} • ${q.topic}`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <SummaryCounts />
        </aside>
      </div>
    </div>
  );
}

function Legend() {
  const items: Array<[QStatus, string]> = [
    ["answered", "Answered"],
    ["not-answered", "Not Answered"],
    ["not-visited", "Not Visited"],
    ["marked", "Marked"],
    ["answered-marked", "Answered & Marked"],
  ];
  return (
    <div className="grid grid-cols-2 gap-1 text-xs">
      {items.map(([s, label]) => (
        <div key={s} className="flex items-center gap-2">
          <span className={cn("h-4 w-4 rounded", statusClasses(s, false).split(" ").filter((c) => c.startsWith("bg-") || c.startsWith("border")).join(" "))} />
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

function SummaryCounts() {
  const statuses = useTestStore((s) => s.statuses);
  const counts = useMemo(() => {
    const c = { answered: 0, "not-answered": 0, "not-visited": 0, marked: 0, "answered-marked": 0 };
    for (const k of Object.values(statuses)) c[k]++;
    return c;
  }, [statuses]);
  return (
    <div className="mt-4 space-y-1 text-xs text-muted-foreground">
      <div>Answered: <b className="text-foreground">{counts.answered + counts["answered-marked"]}</b></div>
      <div>Marked: <b className="text-foreground">{counts.marked + counts["answered-marked"]}</b></div>
      <div>Not answered: <b className="text-foreground">{counts["not-answered"]}</b></div>
      <div>Not visited: <b className="text-foreground">{counts["not-visited"]}</b></div>
    </div>
  );
}

function AnswerInput({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: number | number[] | string | null;
  onChange: (v: number | number[] | string | null) => void;
}) {
  if (q.type === "MCQ") {
    return (
      <div className="space-y-2">
        {q.options!.map((opt, i) => (
          <label
            key={i}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded border p-3 hover:bg-accent",
              value === i && "border-primary bg-accent",
            )}
          >
            <input
              type="radio"
              checked={value === i}
              onChange={() => onChange(i)}
              className="mt-1"
            />
            <span className="text-sm">
              <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
              <MathText>{opt}</MathText>
            </span>
          </label>
        ))}
      </div>
    );
  }
  if (q.type === "MSQ") {
    const arr = (value as number[]) ?? [];
    const toggle = (i: number) => {
      const set = new Set(arr);
      set.has(i) ? set.delete(i) : set.add(i);
      onChange([...set].sort());
    };
    return (
      <div className="space-y-2">
        {q.options!.map((opt, i) => (
          <label
            key={i}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded border p-3 hover:bg-accent",
              arr.includes(i) && "border-primary bg-accent",
            )}
          >
            <input
              type="checkbox"
              checked={arr.includes(i)}
              onChange={() => toggle(i)}
              className="mt-1"
            />
            <span className="text-sm">
              <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
              <MathText>{opt}</MathText>
            </span>
          </label>
        ))}
      </div>
    );
  }
  // NAT
  return (
    <div className="max-w-sm">
      <label className="mb-2 block text-sm text-muted-foreground">
        Enter your numeric answer
      </label>
      <Input
        type="text"
        inputMode="decimal"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. 3.14"
      />
    </div>
  );
}
