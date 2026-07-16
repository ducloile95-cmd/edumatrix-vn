import type { ReactNode } from "react";

export function MotionTabPanel({ motionKey, children, className = "" }: { motionKey: string; children: ReactNode; className?: string }) {
  return <div key={motionKey} className={`motion-content-enter ${className}`}>{children}</div>;
}
