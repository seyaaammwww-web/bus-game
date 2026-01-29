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
          // Updated: White/ivory background with purple borders and glow
          "flex h-12 w-full rounded-[4px] border-[3px] border-[#4c1d95] bg-gradient-to-b from-white to-[#faf5ff] px-4 py-2 text-lg",
          "shadow-[4px_4px_0_0_#2e1065,_0_0_10px_rgba(139,92,246,0.1)]",
          "transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-[#8b5cf6]/50",
          "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-[#8b5cf6]",
          "focus-visible:shadow-[4px_4px_0_0_#4c1d95,_0_0_20px_rgba(139,92,246,0.3)]",
          "hover:border-[#7c3aed] hover:shadow-[4px_4px_0_0_#4c1d95,_0_0_15px_rgba(139,92,246,0.2)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "font-pixel-text text-[#4c1d95]",
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
