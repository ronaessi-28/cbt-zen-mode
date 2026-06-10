import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { TestRunner } from "@/components/test/TestRunner";

export const Route = createFileRoute("/test")({
  head: () => ({
    meta: [
      { title: "Test in Progress — GATE CSE Mock" },
      { name: "description", content: "GATE CSE Mock Test CBT interface." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TestPage,
});

function TestPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="min-h-screen" />;
  return <TestRunner />;
}
