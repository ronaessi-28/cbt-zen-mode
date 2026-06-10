import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ResultView } from "@/components/test/ResultView";

export const Route = createFileRoute("/result")({
  head: () => ({
    meta: [
      { title: "Result — GATE CSE Mock" },
      { name: "description", content: "Your GATE CSE Mock Test result and analytics." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResultPage,
});

function ResultPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="min-h-screen" />;
  return <ResultView />;
}
