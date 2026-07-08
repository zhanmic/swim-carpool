"use client";

import { snapTimeToStep, TIME_STEP_SECONDS } from "@/lib/dates";
import type { InputHTMLAttributes } from "react";

interface TimeInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "step" | "value" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
}

const baseClassName = "time-input block min-w-0 box-border";

export function TimeInput({ value, onChange, className = "", ...props }: TimeInputProps) {
  return (
    <input
      type="time"
      step={TIME_STEP_SECONDS}
      value={value}
      onChange={(e) => {
        const next = e.target.value;
        onChange(next ? snapTimeToStep(next) : "");
      }}
      className={className ? `${baseClassName} ${className}` : baseClassName}
      {...props}
    />
  );
}
