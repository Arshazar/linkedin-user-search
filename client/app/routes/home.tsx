import { useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, Search } from "lucide-react";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "~/components/ui";
import { searchUsers } from "~/lib/api";
import type { Route } from "./+types/home";
import { Particles } from "~/components/elements";
import { RangePicker, SearchInput, UserList } from "~/components/common";

type Gender = "male" | "female" | "all";
type SortOrder = "desc" | "asc";

const GENDERS: Gender[] = ["all", "male", "female"];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Linkedin Search" },
    { name: "description", content: "Linkedin search for users" },
  ];
}

export default function Home() {
  // Live input text — only submitted values drive the query.
  const [text, setText] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [gender, setGender] = useState<Gender>("all");
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const startDate = date?.from ? format(date.from, "yyyy-MM-dd") : undefined;
  const endDate = date?.to ? format(date.to, "yyyy-MM-dd") : undefined;

  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: [
        "users",
        submittedQuery,
        gender,
        startDate,
        endDate,
        sortOrder,
      ],
      queryFn: ({ pageParam }) =>
        searchUsers({
          q: submittedQuery,
          gender,
          startDate,
          endDate,
          sortBy: "job_start_date",
          sortOrder,
          page: pageParam,
          limit: 20,
        }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    });

  const users = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <>
      <Particles />
      <div className="@container flex relative items-center justify-center w-full h-screen">
        <div className="w-1/2 @lg:w-3/4 @sm:w-[90%] max-h-[92vh] bg-white flex flex-col rounded-4xl gap-4 p-3 @lg:p-8 @md:p-6 @sm:p-4 overflow-hidden">
          <form
            className="flex gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmittedQuery(text);
            }}
          >
            <SearchInput
              value={text}
              onChange={(value) => setText(value)}
              resultsCount={total}
              className="flex-1"
            />
            <Button type="submit" className="h-10 shrink-0">
              <Search />
              Search
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" className="w-24 h-10 capitalize shrink-0">
                    {gender === "all" ? "All" : gender}
                  </Button>
                }
              />
              <DropdownMenuContent>
                <DropdownMenuRadioGroup
                  value={gender}
                  onValueChange={(value) => setGender(value as Gender)}
                >
                  {GENDERS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option}
                      value={option}
                      closeOnClick
                      className="capitalize"
                    >
                      {option === "all" ? "All" : option}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <RangePicker
              value={date}
              onChange={(value) => setDate(value)}
              className="[&>button]:h-10"
            />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" className="h-10 shrink-0">
                    {sortOrder === "desc" ? (
                      <ArrowDownWideNarrow />
                    ) : (
                      <ArrowUpWideNarrow />
                    )}
                    {sortOrder === "desc" ? "Newest first" : "Oldest first"}
                  </Button>
                }
              />
              <DropdownMenuContent>
                <DropdownMenuRadioGroup
                  value={sortOrder}
                  onValueChange={(value) => setSortOrder(value as SortOrder)}
                >
                  <DropdownMenuRadioItem value="desc" closeOnClick>
                    Newest to oldest
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="asc" closeOnClick>
                    Oldest to newest
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </form>
          <UserList
            className="min-h-0 flex-1"
            users={users}
            total={total}
            isPending={isPending}
            isFetchingNextPage={isFetchingNextPage}
            isError={isError}
            hasNextPage={hasNextPage}
            onFetchNextPage={() => void fetchNextPage()}
            onRetry={() => void refetch()}
          />
        </div>
      </div>
    </>
  );
}
