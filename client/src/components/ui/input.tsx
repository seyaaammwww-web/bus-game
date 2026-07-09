import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-purple-200/60 bg-white/95 px-4 py-2 text-lg font-medium",
          "shadow-sm backdrop-blur-sm",
          "transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-purple-400/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/40 focus-visible:border-purple-400",
          "focus-visible:shadow-[0_0_0_4px_rgba(124,58,237,0.1)]",
          "hover:border-purple-300 hover:shadow-md",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "text-[#4c1d95]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
