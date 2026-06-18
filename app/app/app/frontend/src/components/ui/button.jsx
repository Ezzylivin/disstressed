import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-xs font-bold uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:pointer-events-none disabled:opacity-50 rounded-none shadow-none border border-transparent select-none",
  {
    variants: {
      variant: {
        default: "bg-black text-white hover:bg-neutral-800",
        secondary: "bg-white text-black border-black hover:bg-neutral-100",
        action: "bg-[#002fa7] text-white hover:bg-blue-900",
        destructive: "bg-[#ff3b30] text-white hover:bg-red-700",
        ghost: "hover:bg-neutral-100 text-black",
        link: "text-[#002fa7] underline-offset-4 hover:underline lowercase normal-case tracking-normal font-normal",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-[11px]",
        lg: "h-10 px-8 text-sm",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
