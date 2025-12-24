import React, { useState, useEffect, forwardRef, ChangeEvent, FocusEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface NumericInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value" | "min" | "max" | "step"> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  decimalScale?: number;
  allowEmpty?: boolean;
}

/**
 * NumericInput - Engineering Grade
 * 
 * Features:
 * - Uses type="text" to avoid browser "rounding" behavior with steps
 * - Validates on Blur, not on Change (allows user to type "0." without it becoming "0")
 * - formats to fixed decimals on Blur
 */
const NumericInput = forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, min, max, step, decimalScale = 2, allowEmpty = false, className, ...props }, ref) => {
    // Internal string state to match what the user is typing exactly
    const [strVal, setStrVal] = useState<string>(
      value !== undefined && value !== null && !Number.isNaN(value) 
        ? value.toString() 
        : ""
    );

    // Sync from parent prop (if changed externally)
    useEffect(() => {
        // Only update if the parsed value is different to avoid cursor jumping or fighting user input
        // But for engineering apps, usually external updates are rare during editing.
        // We check if Number(strVal) is significantly different from value.
        const currentNum = parseFloat(strVal);
        if (Math.abs(currentNum - value) > Number.EPSILON || (strVal === "" && value !== 0)) {
             setStrVal(value !== undefined && value !== null && !Number.isNaN(value) ? value.toString() : "");
        }
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      setStrVal(e.target.value);
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      let raw = e.target.value;
      
      // Handle empty
      if (raw.trim() === "") {
        if (allowEmpty) {
            // maybe propagate undefined? For now assume 0 or last valid.
            // But prop says onChange(number).
            onChange(0);  
            setStrVal("0");
        } else {
             // Revert to current prop value
             setStrVal(value.toString());
        }
        return;
      }

      // Parse
      let val = parseFloat(raw);

      // Validate Nan
      if (Number.isNaN(val)) {
        // Revert
        setStrVal(value.toString());
        return;
      }

      // Custom formatting
      const formatted = decimalScale !== undefined ? val.toFixed(decimalScale) : val.toString();
      
      // Update parent
      // Note: we pass the raw float to parent, but show formatted string
      onChange(val);
      setStrVal(formatted); 
      
      if (props.onBlur) {
          props.onBlur(e);
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={strVal}
        onChange={handleChange}
        onBlur={handleBlur}
        className={className}
        {...props}
      />
    );
  }
);

NumericInput.displayName = "NumericInput";

export { NumericInput };
