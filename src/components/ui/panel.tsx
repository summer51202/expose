import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type PanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Panel({ className, children, ...props }: PanelProps) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-line bg-panel p-6 shadow-[0_12px_32px_rgba(38,29,19,0.08)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
