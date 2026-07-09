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
          "flex h-12 w-full rounded-sm border-[3px] border-[#350D7A] bg-[#FFFEF5] px-4 py-2 text-lg font-semibold",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-[#350D7A]/40",
          "focus-visible:outline-none focus-visible:border-[#F640A8]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "text-[#350D7A]",
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
