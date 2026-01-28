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
          "flex h-12 w-full rounded-[4px] border-[3px] border-[#2C0834] bg-[#FFFDD1] px-3 py-2 text-sm shadow-[4px_4px_0_0_#2C0834] transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#31093A]/50 focus-visible:outline-none focus-visible:ring-0 focus-visible:translate-y-[2px] focus-visible:shadow-none disabled:cursor-not-allowed disabled:opacity-50 font-pixel-text text-[#31093A]",
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
