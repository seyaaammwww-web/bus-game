import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "retro-action-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-white/95 text-[#4c1d95] hover:bg-white border-purple-200/60",
        destructive:
          "bg-gradient-to-b from-red-500 to-red-600 text-white border-red-700/40 !shadow-[0_4px_14px_rgba(239,68,68,0.35)] hover:from-red-600 hover:to-red-700",
        outline:
          "bg-white/80 backdrop-blur-sm text-[#4c1d95] border-purple-200/70 hover:bg-white hover:border-purple-300",
        secondary:
          "bg-gradient-to-b from-[#8b5cf6] to-[#7c3aed] text-white border-purple-400/30 !shadow-button hover:from-[#7c3aed] hover:to-[#6d28d9] flex-col",
        ghost:
          "hover:bg-purple-500/10 text-[#4c1d95] !border-transparent !shadow-none hover:!transform-none active:!transform-none",
        link: "text-[#7c3aed] underline-offset-4 hover:underline !border-transparent !shadow-none active:!transform-none",
        retro:
          "bg-gradient-to-b from-amber-400 to-amber-500 text-[#4c1d95] border-amber-600/40 !shadow-[0_4px_14px_rgba(251,191,36,0.4)] hover:from-amber-500 hover:to-amber-600",
        primary:
          "bg-gradient-to-b from-[#8b5cf6] to-[#7c3aed] text-white border-purple-500/30 !shadow-button hover:from-[#7c3aed] hover:to-[#6d28d9]",
        accent:
          "bg-gradient-to-b from-cyan-400 to-cyan-500 text-slate-900 border-cyan-600/30 !shadow-[0_4px_14px_rgba(6,182,212,0.35)] hover:from-cyan-500 hover:to-cyan-600",
      },
      size: {
        default: "h-11 px-6 py-2 text-sm",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-14 rounded-xl px-8 text-lg font-semibold",
        xl: "h-20 rounded-2xl px-10 text-2xl font-bold",
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
