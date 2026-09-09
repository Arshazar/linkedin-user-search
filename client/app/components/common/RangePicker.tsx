import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "~/lib/utils";
import { Button, Calendar, Field, FieldLabel, Popover,
  PopoverContent,
  PopoverTrigger } from "~/components/ui";

interface RangePickerProps {
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
  label?: string;
  className?: string;
}

export function RangePicker({ value, onChange, label, className }: RangePickerProps) {
  return (
    <Field className={cn("mx-auto w-80", className)}>
      {label && <FieldLabel htmlFor="date-picker-range">{label}</FieldLabel>}
      <Popover>
        <PopoverTrigger render={<Button variant="outline" id="date-picker-range" className="justify-start px-2.5 font-normal"><CalendarIcon data-icon="inline-start" />{value?.from ? (
            value?.to ? (
              <>
                {format(value?.from, "LLL dd, y")} -{" "}
                {format(value?.to, "LLL dd, y")}
              </>
            ) : (
              format(value?.from, "LLL dd, y")
            )
          ) : (
            <span>Pick a date</span>
          )}</Button>} />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
            resetOnSelect
          />
        </PopoverContent>
      </Popover>
    </Field>
  )
}
