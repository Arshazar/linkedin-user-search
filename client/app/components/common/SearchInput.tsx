import { Search } from "lucide-react";

import { cn } from "~/lib/utils";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  resultsCount: number;
  className?: string;
}

export function SearchInput ({ value, onChange, resultsCount, className }: SearchInputProps) {
  return (
    <InputGroup className={cn("w-full h-10", className)}>
      <InputGroupInput placeholder="Search..." value={value} onChange={(e) => onChange(e.target.value)} />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">{resultsCount} results</InputGroupAddon>
    </InputGroup>
  )
}
