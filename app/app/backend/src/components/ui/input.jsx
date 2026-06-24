import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-none border-b border-black bg-transparent px-0 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-xs file:font-bold file:uppercase file:tracking-wider placeholder:text-neutral-400 focus:outline-none focus:border-[#002fa7] disabled:cursor-not-allowed disabled:opacity-50 font-mono-pi",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
