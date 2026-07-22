import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value = [50], onValueChange, min = 0, max = 100, step = 1, disabled = false, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = [Number(e.target.value)];
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };

    const currentValue = value ?? internalValue;

    return (
      <div ref={ref} className={cn("relative flex items-center w-full", className)} {...props}>
        <input
          type="range"
          value={currentValue[0]}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer slider-thumb"
        />
      </div>
    )
  }
)

Slider.displayName = "Slider"

export { Slider }
