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
          "bg-gradient-to-b from-[#FFFEF5] to-[#F5F0E0] text-[#4c1d95] hover:brightness-110",
        destructive:
          "bg-gradient-to-b from-[#ff6b6b] to-[#ee5a5a] text-white !border-[#c0392b] !shadow-[4px_4px_0_0_#7f1d1d] hover:brightness-110",
        outline:
          "bg-white/90 backdrop-blur-sm text-[#4c1d95] hover:bg-[#f5f0ff]",
        secondary:
          "bg-gradient-to-b from-[#a78bfa] to-[#8b5cf6] text-white hover:brightness-110 flex-col",
        ghost:
          "hover:bg-[#4c1d95]/10 text-[#4c1d95] !border-transparent !shadow-none hover:transform-none active:!transform-none",
        link: "text-[#7c3aed] underline-offset-4 hover:underline !border-transparent !shadow-none active:!transform-none",
        retro:
          "bg-gradient-to-b from-white to-[#faf5ff] text-[#4c1d95] hover:brightness-110",
        primary:
          "bg-gradient-to-b from-[#8b5cf6] to-[#7c3aed] text-white hover:brightness-110",
        accent:
          "bg-gradient-to-b from-[#22d3ee] to-[#06b6d4] text-[#1e1b4b] hover:brightness-110",
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
