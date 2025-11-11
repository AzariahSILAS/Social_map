import * as React from "react";
import { cn } from "@/components/ui/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base layout & shape
        "flex h-9 w-full min-w-0 rounded-md  px-3 py-1 text-black md:text-sm",
        // Colors
        "bg-slate-900 text-black placeholder:text-slate-400 ",
        // Focus / selection
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500",
        // File input and disabled states
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Allow overrides
        className
      )}
      {...props}
    />
  );
}

export { Input };
