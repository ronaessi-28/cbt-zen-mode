import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTestStore } from "@/store/testStore";
import { TOPICS, TEST_DURATION_SECONDS } from "@/lib/test-config";
import { useEffect, useState } from "react";
import { Clock, FileText, ListChecks, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GATE CSE Full-Length Mock Test" },
      {
        name: "description",
        content:
          "Free GATE CSE full-length mock test with 280 questions across 14 topics, 3-hour CBT interface, instant analytics and downloadable PDF report.",
      },
      { property: "og:title", content: "GATE CSE Full-Length Mock Test" },
      {
        property: "og:description",
        content:
          "Full-length 420-mark GATE CSE mock test with real CBT-style interface, palette, timer and detailed analytics.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { started, submitted, remaining, startTest, resetTest } = useTestStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const inProgress = mounted && started && !submitted;
  const hasFinished = mounted && submitted;

  const begin = async () => {
    startTest();
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      /* user can fullscreen later */
    }
    navigate({ to: "/test" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8 text-center">
          <Badge variant="outline" className="mb-3">GATE CSE • 2026</Badge>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            GATE CSE Full-Length Mock Test
          </h1>
          <p className="mt-3 text-muted-foreground">
            One full-length CBT mock • 280 questions • 420 marks • 3 hours
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card icon={<ListChecks />} title="280 Questions" desc="14 topics × (10 one-mark + 10 two-mark)" />
          <Card icon={<Clock />} title="3 Hours" desc={`${TEST_DURATION_SECONDS / 60} minutes • auto-submit on timeout`} />
          <Card icon={<FileText />} title="Full Analytics" desc="Topic-wise charts + downloadable PDF" />
        </div>

        <div className="mt-8 rounded-xl border bg-card p-6">
          <h2 className="mb-3 text-lg font-semibold">Instructions</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>The test must be taken in fullscreen. Right-click, copy/paste and devtool shortcuts are disabled.</li>
            <li>Tab-switch or fullscreen exit triggers a warning. <b>On the 3rd warning the test is auto-submitted.</b></li>
            <li>MCQ: single correct (−1/3 or −2/3 negative marking). MSQ: multiple correct, no negatives. NAT: numeric input, no negatives.</li>
            <li>Use the palette to jump to any question. Mark for review, clear response, and bookmark are available.</li>
            <li>Your progress auto-saves every 15 seconds. Refreshing the page restores it.</li>
          </ul>
          <div className="mt-4 flex items-center gap-2 rounded-md bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            <ShieldAlert className="h-4 w-4" /> Make sure you are ready before starting — the timer cannot be paused.
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          {TOPICS.map((t) => (
            <div key={t} className="rounded-md border bg-card px-3 py-2 text-xs">{t}</div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {inProgress ? (
            <>
              <Button size="lg" onClick={() => navigate({ to: "/test" })}>
                Resume Test ({Math.floor(remaining / 60)}m left)
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  if (confirm("Discard current progress and start over?")) resetTest();
                }}
              >
                Discard & Restart
              </Button>
            </>
          ) : hasFinished ? (
            <>
              <Button size="lg" onClick={() => navigate({ to: "/result" })}>
                View Last Result
              </Button>
              <Button size="lg" variant="outline" onClick={begin}>
                Start New Attempt
              </Button>
            </>
          ) : (
            <Button size="lg" onClick={begin}>
              Start Test
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{desc}</div>
    </div>
  );
}
