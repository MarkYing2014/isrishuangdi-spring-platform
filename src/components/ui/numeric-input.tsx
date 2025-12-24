import React, { useState, useEffect, forwardRef, ChangeEvent, FocusEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface NumericInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value" | "min" | "max" | "step"> {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
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
        // We check if Number(strVal) is significantly different from value.
        const currentNum = parseFloat(strVal);
        const valDefined = value !== undefined && value !== null && !Number.isNaN(value);
        
        if (!valDefined) {
            if (strVal !== "") setStrVal("");
        } else {
             if (Math.abs(currentNum - (value as number)) > Number.EPSILON || strVal === "") {
                 setStrVal(value!.toString());
             }
        }
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const newVal = e.target.value;
      setStrVal(newVal);

      // Try to parse and update parent immediately
      // This ensures 'Enter' key submits or other non-blur actions use the current value
      if (newVal.trim() === "") {
        if (allowEmpty) {
          onChange(undefined);
        }
        // If not allowEmpty, we don't update parent to undefined/0 yet, wait for blur? 
        // Or we update to 0? Let's mimic handleBlur logic but be careful not to annoy user.
        // Actually, for empty string while typing, it's safer NOT to fire onChange(0) 
        // because it might trigger validation errors prematurely.
        // But for allowEmpty, it's fine.
        return;
      }

      const val = parseFloat(newVal);
      if (!Number.isNaN(val)) {
        // Valid number, update parent
        onChange(val);
      }
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      let raw = e.target.value;
      
      // Handle empty
      if (raw.trim() === "") {
        if (allowEmpty) {
            onChange(undefined);
            setStrVal("");
        } else {
             // Revert to current prop value (if valid) or 0
             const safe = value ?? 0;
             setStrVal(safe.toString());
             onChange(safe); // re-emit to ensure sync
        }
        return;
      }

      // Parse
      let val = parseFloat(raw);

      // Validate Nan
      if (Number.isNaN(val)) {
        // Revert
        const safe = value ?? 0;
        setStrVal(safe.toString());
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
