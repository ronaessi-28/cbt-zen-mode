import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

/**
 * Renders text containing inline ($...$) and display ($$...$$) LaTeX with KaTeX.
 */
export function MathText({ children, className }: { children: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const text = children ?? "";
    // tokenize $$...$$ and $...$
    const parts: Array<{ type: "text" | "inline" | "display"; value: string }> = [];
    let i = 0;
    while (i < text.length) {
      if (text.startsWith("$$", i)) {
        const end = text.indexOf("$$", i + 2);
        if (end === -1) {
          parts.push({ type: "text", value: text.slice(i) });
          break;
        }
        parts.push({ type: "display", value: text.slice(i + 2, end) });
        i = end + 2;
      } else if (text[i] === "$") {
        const end = text.indexOf("$", i + 1);
        if (end === -1) {
          parts.push({ type: "text", value: text.slice(i) });
          break;
        }
        parts.push({ type: "inline", value: text.slice(i + 1, end) });
        i = end + 1;
      } else {
        const nextD = text.indexOf("$$", i);
        const nextS = text.indexOf("$", i);
        const next =
          nextD === -1 ? nextS : nextS === -1 ? nextD : Math.min(nextD, nextS);
        const stop = next === -1 ? text.length : next;
        parts.push({ type: "text", value: text.slice(i, stop) });
        i = stop;
      }
    }
    el.innerHTML = "";
    for (const p of parts) {
      if (p.type === "text") {
        el.appendChild(document.createTextNode(p.value));
      } else {
        const span = document.createElement("span");
        try {
          katex.render(p.value, span, {
            throwOnError: false,
            displayMode: p.type === "display",
          });
        } catch {
          span.textContent = p.value;
        }
        el.appendChild(span);
      }
    }
  }, [children]);

  return <span ref={ref} className={className} />;
}
