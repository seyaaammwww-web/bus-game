import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "retro-action-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F640A8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFEE2] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#FFFEE5] text-[#350D7A] hover:bg-[#FFFDD6]",
        destructive:
          "bg-[#FF6957] text-[#350D7A] hover:bg-[#FF8A50]",
        outline:
          "bg-[#FFFEE2] text-[#350D7A] hover:bg-[#FFFDD6]",
        secondary:
          "bg-[#6714A8] text-[#FFFEE2] hover:bg-[#871BB7] flex-col",
        ghost:
          "hover:bg-[#350D7A]/10 text-[#350D7A] !border-transparent !shadow-none hover:!transform-none active:!transform-none",
        link: "text-[#6714A8] underline-offset-4 hover:underline !border-transparent !shadow-none active:!transform-none",
        retro:
          "bg-[#FF8A50] text-[#350D7A] hover:bg-[#FFA168]",
        primary:
          "bg-[#6714A8] text-[#FFFEE2] hover:bg-[#871BB7]",
        accent:
          "bg-[#F640A8] text-[#FFFEE2] hover:bg-[#FF6957]",
      },
      size: {
        default: "h-11 px-6 py-2 text-sm",
        sm: "h-9 px-3 text-xs border-2 !shadow-pixel-sm",
        lg: "h-14 px-8 text-lg",
        xl: "h-20 px-10 text-2xl !shadow-pixel-lg",
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
