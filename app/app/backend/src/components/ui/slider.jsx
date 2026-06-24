import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center h-5 cursor-pointer", className)}
    {...props}>
    <SliderPrimitive.Track className="relative h-1 w-full grow bg-neutral-200 rounded-none">
      <SliderPrimitive.Range className="absolute h-full bg-[#002fa7] rounded-none" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 border border-black bg-white rounded-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black disabled:pointer-events-none disabled:opacity-50 active:bg-black" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
