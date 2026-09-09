import { useCallback } from "react";
import { AlertCircle, Loader2, SearchX } from "lucide-react";
import { List, useDynamicRowHeight, type RowComponentProps } from "react-window";

import { cn } from "~/lib/utils";
import { UserCard } from "./UserCard";
import { Button } from "~/components/ui";
import type { UserSummaryItem } from "~/lib/api";

function SkeletonCard() {
  return (
    <div
      aria-hidden
      className="h-[176px] w-full shrink-0 animate-pulse rounded-xl bg-muted/60"
    />
  );
}

interface UserListRowProps {
  users: UserSummaryItem[];
}

/**
 * Renders one user card. The `style` prop (absolute positioning + vertical
 * offset) comes from react-window; with dynamic row heights the library
 * measures each row via its own ResizeObserver, so no height is set here.
 */
function UserListRow({ index, style, users }: RowComponentProps<UserListRowProps>) {
  const user = users[index];
  if (!user) return null;

  return (
    <div style={style} className="pb-2" data-user-row={index}>
      <UserCard user={user} />
    </div>
  );
}

interface UserListProps {
  users: UserSummaryItem[];
  total: number;
  isPending: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  hasNextPage: boolean;
  onFetchNextPage: () => void;
  onRetry: () => void;
  className?: string;
}

export function UserList({
  users,
  total,
  isPending,
  isFetchingNextPage,
  isError,
  hasNextPage,
  onFetchNextPage,
  onRetry,
  className,
}: UserListProps) {
  // Row heights are measured by react-window's ResizeObserver. The cache is
  // keyed on the first user's id so it resets when a new query's data arrives
  // (filter/sort/search change) but persists while pages append.
  const rowHeightCache = useDynamicRowHeight({
    defaultRowHeight: 192,
    key: users[0]?.id ?? "empty",
  });

  const handleRowsRendered = useCallback(
    (
      _visibleRows: { startIndex: number; stopIndex: number },
      allRows: { startIndex: number; stopIndex: number },
    ) => {
      if (isFetchingNextPage || isPending || isError || !hasNextPage) return;
      if (allRows.stopIndex >= users.length - 6) {
        onFetchNextPage();
      }
    },
    [isFetchingNextPage, isPending, isError, hasNextPage, users.length, onFetchNextPage],
  );

  const rowComponent = useCallback(
    (props: RowComponentProps<UserListRowProps>) => <UserListRow {...props} />,
    [],
  );
  const rowKey = useCallback(
    (index: number) => users[index]?.id ?? index,
    [users],
  );

  if (isPending) {
    return (
      <div className={cn("flex flex-col gap-2 overflow-y-auto", className)}>
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 overflow-y-auto p-6 text-center",
          className,
        )}
      >
        <AlertCircle className="size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Failed to load users. Please try again.
        </p>
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 overflow-y-auto p-6 text-center",
          className,
        )}
      >
        <SearchX className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No results found. Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <List
        rowComponent={rowComponent}
        rowCount={users.length}
        rowHeight={rowHeightCache}
        rowKey={rowKey}
        rowProps={{ users }}
        onRowsRendered={handleRowsRendered}
        overscanCount={3}
        className="focus-visible:outline-none"
      />
      <div className="flex shrink-0 items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
        {isFetchingNextPage && (
          <>
            <Loader2 className="size-4 animate-spin" />
            Loading more results…
          </>
        )}
        {!hasNextPage && users.length > 0 && (
          <span>No more results ({total} total)</span>
        )}
      </div>
    </div>
  );
}
