import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "retro-action-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-white text-[#4c1d95] hover:bg-[#f3f4f6]",
        destructive:
          "bg-[#ef4444] text-white !border-[#7f1d1d] !shadow-[4px_4px_0_0_#450a0a] hover:bg-[#dc2626]",
        outline:
          "bg-white/90 backdrop-blur-sm text-[#4c1d95] hover:bg-[#f5f0ff]",
        secondary:
          "bg-[#8b5cf6] text-white !border-[#4c1d95] !shadow-[4px_4px_0_0_#2e1065] hover:bg-[#7c3aed] flex-col",
        ghost:
          "hover:bg-[#4c1d95]/10 text-[#4c1d95] !border-transparent !shadow-none hover:transform-none active:!transform-none",
        link: "text-[#7c3aed] underline-offset-4 hover:underline !border-transparent !shadow-none active:!transform-none",
        retro:
          "bg-[#fbbf24] text-[#4c1d95] !border-[#78350f] !shadow-[4px_4px_0_0_#451a03] hover:bg-[#f59e0b]",
        primary:
          "bg-[#7c3aed] text-white !border-[#2e1065] !shadow-[4px_4px_0_0_#170831] hover:bg-[#6d28d9]",
        accent:
          "bg-[#06b6d4] text-[#1e1b4b] !border-[#164e63] !shadow-[4px_4px_0_0_#083344] hover:bg-[#0891b2]",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-[4px] px-3 text-xs",
        lg: "h-14 rounded-xl px-8 text-lg font-pixel-title",
        xl: "h-20 rounded-xl px-10 text-2xl font-pixel-title",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
