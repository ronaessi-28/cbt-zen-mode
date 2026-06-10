import { useEffect } from "react";
import { useTestStore } from "@/store/testStore";
import { toast } from "sonner";
import { MAX_WARNINGS } from "@/lib/test-config";

/**
 * Anti-cheat: disables right-click, text selection, common devtool shortcuts,
 * copy/paste, and tracks tab-switches & fullscreen exits with 3-strike auto-submit.
 */
export function AntiCheat({ enabled }: { enabled: boolean }) {
  const registerWarning = useTestStore((s) => s.registerWarning);
  const submitted = useTestStore((s) => s.submitted);

  useEffect(() => {
    if (!enabled || submitted) return;

    const block = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // F12
      if (e.key === "F12") return block(e);
      // Ctrl/Cmd + Shift + I/J/C (devtools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["i", "j", "c"].includes(k))
        return block(e);
      // Ctrl/Cmd + U (view source), S (save), P (print)
      if ((e.ctrlKey || e.metaKey) && ["u", "s", "p"].includes(k)) return block(e);
      // Ctrl/Cmd + C / V / X / A (copy/paste/cut/select-all)
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "a"].includes(k)) {
        const t = e.target as HTMLElement | null;
        // allow inside inputs for NAT typing
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
        return block(e);
      }
    };

    const handleWarning = (reason: string) => {
      const w = registerWarning();
      if (w >= MAX_WARNINGS) {
        toast.error(`Final warning reached (${w}/${MAX_WARNINGS}). Test auto-submitted.`);
      } else {
        toast.warning(`Warning ${w}/${MAX_WARNINGS}: ${reason}`);
      }
    };

    const onVis = () => {
      if (document.hidden) handleWarning("Tab switch detected");
    };
    const onBlur = () => handleWarning("Window lost focus");
    const onFsChange = () => {
      if (!document.fullscreenElement) handleWarning("Fullscreen exited");
    };

    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("paste", (e) => {
      const t = e.target as HTMLElement | null;
      if (!(t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA"))) block(e);
    });
    document.addEventListener("selectstart", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFsChange);

    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("paste", block as never);
      document.removeEventListener("selectstart", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, [enabled, submitted, registerWarning]);

  return null;
}
