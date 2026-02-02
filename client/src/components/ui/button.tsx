import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[4px] text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-all font-pixel-button" +
  " hover:translate-y-[-2px] active:translate-y-[0px] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[#FFFEF5] to-[#F5F0E0] text-[#4c1d95] border-[3px] border-[#4c1d95] shadow-[4px_4px_0_0_#2e1065] hover:shadow-[6px_6px_0_0_#7c3aed] hover:border-[#7c3aed] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] font-bold uppercase",
        destructive:
          "bg-gradient-to-b from-[#ff6b6b] to-[#ee5a5a] text-white border-[3px] border-[#c0392b] shadow-[4px_4px_0_0_#7f1d1d] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] font-bold",
        outline:
          "border-[3px] border-[#4c1d95] bg-white/90 backdrop-blur-sm text-[#4c1d95] hover:bg-[#f5f0ff] shadow-[4px_4px_0_0_#2e1065] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] font-bold",
        secondary:
          "bg-gradient-to-b from-[#a78bfa] to-[#8b5cf6] text-white border-[3px] border-[#5b21b6] shadow-[4px_4px_0_0_#4c1d95] hover:from-[#c4b5fd] hover:to-[#a78bfa] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] font-bold",
        ghost:
          "hover:bg-[#4c1d95]/10 text-[#4c1d95] hover:border-[3px] hover:border-transparent",
        link: "text-[#7c3aed] underline-offset-4 hover:underline",
        retro:
          "bg-gradient-to-b from-white to-[#faf5ff] text-[#4c1d95] border-[3px] border-[#4c1d95] shadow-[4px_4px_0_0_#2e1065,_0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[6px_6px_0_0_#7c3aed,_0_0_30px_rgba(139,92,246,0.4)] hover:border-[#7c3aed] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] font-bold",
        // NEW: Primary purple button
        primary:
          "bg-gradient-to-b from-[#8b5cf6] to-[#7c3aed] text-white border-[3px] border-[#5b21b6] shadow-[4px_4px_0_0_#4c1d95] hover:from-[#a78bfa] hover:to-[#8b5cf6] hover:shadow-[6px_6px_0_0_#5b21b6] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] font-bold uppercase",
        // NEW: Accent cyan button
        accent:
          "bg-gradient-to-b from-[#22d3ee] to-[#06b6d4] text-[#1e1b4b] border-[3px] border-[#0891b2] shadow-[4px_4px_0_0_#0e7490,_0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[6px_6px_0_0_#0891b2,_0_0_25px_rgba(6,182,212,0.5)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] font-bold uppercase",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-[4px] px-3 text-xs",
        lg: "h-14 rounded-[6px] px-8 text-lg",
        xl: "h-20 rounded-[6px] px-10 text-2xl",
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
