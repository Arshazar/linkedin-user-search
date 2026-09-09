import { useState } from "react";
import { subDays } from "date-fns";
import type { DateRange } from "react-day-picker";

import type { Route } from "./+types/home";
import { Particles } from "~/components/elements";
import { RangePicker, SearchInput } from "~/components/common";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "~/components/ui";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Linkedin Search" },
    { name: "description", content: "Linkedin search for users" },
  ];
}

export default function Home() {
  const [text, setText] = useState("");
  const [gender, setGender] = useState('Male');
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  
  return (
    <>
      <Particles />
      <div className="@container flex relative items-center justify-center w-full h-screen">
        <div className="w-1/2 @lg:w-3/4 @sm:w-[90%] bg-white flex flex-col rounded-4xl gap-4 p-3 @lg:p-8 @md:p-6 @sm:p-4">
          <div className="flex gap-3">
            <SearchInput value={text} onChange={(value) => setText(value)} resultsCount={10} />
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" className="w-20 h-10">{gender}</Button>} />
              <DropdownMenuContent>
                <DropdownMenuRadioGroup value={gender} onValueChange={setGender}>
                  <DropdownMenuRadioItem value="Male">Male</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="Female">Female</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <RangePicker value={date} onChange={(value) => setDate(value)} className="[&>button]:h-10" />
          </div>
          {/* list of linkedin users */}
        </div>
      </div>
    </>
  );
}
