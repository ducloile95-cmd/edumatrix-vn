import { flushSync } from "react-dom";

export function canUseViewTransition(): boolean {
  return typeof document !== "undefined"
    && typeof document.startViewTransition === "function"
    && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function runViewTransition(update: () => void): void {
  if (!canUseViewTransition()) {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
}
