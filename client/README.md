# Client Specification

This document is the complete, unambiguous technical specification for the
client application in `/client`. It is structured to serve as an authoritative
reference for AI coding agents and developers implementing the frontend. The
backend it consumes is specified in `/server.md` and implemented in `/server`.

---

## 1. Overview

The client is a **single-page application with exactly one route: the home
page**. It is a search UI over the LinkedIn user dataset served by the NestJS
backend: the user types a free-text query, optionally applies filters, and
browses results as an infinite, virtualized list of user cards.

- **Framework**: React Router v8 (framework mode — routes defined in
  `app/routes.ts`, entry via `app/root.tsx`, SSR via `react-router-serve`).
- **React**: v19.
- **Styling**: Tailwind CSS v4 (via `@tailwindcss/vite`), container queries used
  for responsiveness.
- **UI components**: shadcn (Base UI based, `@base-ui/react` primitives) in
  `app/components/ui/`, icons from `lucide-react`.
- **Fonts**: `@fontsource-variable/geist`.
- **Dates**: `date-fns` + `react-day-picker`.

### 1.1. Dependencies to add

The following are required by this spec but not yet in `package.json` — install
them (pnpm):

- `@tanstack/react-query` — all server data fetching, including the paginated
  infinite list (`useInfiniteQuery`).
- `react-window` — virtualization of the infinite result list.

---

## 2. Backend API Contract

Base URL: `http://localhost:3000` (server runs on port 3000; CORS is already
enabled for the client origin `http://localhost:5173`).

### 2.1. Search Users

- **Method**: `GET`
- **Path**: `/api/users/search`
- **Query parameters** (all optional; validated server-side, invalid values are
  rejected with 400):

  | Param       | Type     | Allowed values / format                              | Default            | Purpose                                                                      |
  | ----------- | -------- | ---------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------- |
  | `q`         | `string` | free text                                            | `""`               | Multi-field search: full name, job title, company, skills, summary, location |
  | `gender`    | `string` | `"male"`, `"female"`, `"all"`, `""` (lowercase only) | `""`               | Gender filter                                                                |
  | `startDate` | `string` | `YYYY-MM-DD`                                         | –                  | Job start date range lower bound                                             |
  | `endDate`   | `string` | `YYYY-MM-DD`                                         | –                  | Job start date range upper bound                                             |
  | `sortBy`    | `string` | `"job_start_date"` or `"_score"`                     | `"job_start_date"` | Sort field                                                                   |
  | `sortOrder` | `string` | `"asc"` or `"desc"`                                  | `"desc"`           | Sort direction                                                               |
  | `page`      | `number` | integer ≥ 1 (1-based)                                | `1`                | Page number                                                                  |
  | `limit`     | `number` | integer 1–100                                        | `20`               | Items per page                                                               |

- **Response `200 OK`**:

```json
{
  "total": 300,
  "page": 1,
  "limit": 20,
  "totalPages": 15,
  "data": [
    {
      "id": "a59e1208-8dfa-4952-b8f2-bb4faea63d91",
      "linkedinId": "47878127",
      "fullName": "Joseph Holland",
      "gender": "male",
      "jobTitle": "Recruiting Manager",
      "jobCompanyName": "Garver",
      "jobStartDate": "2019-10-01",
      "locationName": "Denton, Texas, United States",
      "skills": ["recruiting", "leadership", "human resources"],
      "summary": "Celebrating its 100th year...",
      "linkedinUrl": "linkedin.com/in/joeyholland"
    }
  ]
}
```

- Every field except `id` and `fullName` is nullable — the UI must handle nulls
  gracefully (render placeholder text or omit).
- `linkedinUrl` has no scheme prefix — render it as `https://<linkedinUrl>` when
  linking.

### 2.2. Get User Details

- **Method**: `GET`, **Path**: `/api/users/:id` (UUID v4)
- Returns the full profile entity (including `experience`, `education`,
  `emails`, `phone_numbers`, social links). Not needed for the current
  single-page scope, but available.

### 2.3. Pagination model

Offset-style pagination (`page`/`limit`), **not** cursor-based. Map it to
`useInfiniteQuery` with
`getNextPageParam: (lastPage) => lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined`,
one page per fetch (`limit: 20`).

---

## 3. Home Page (`app/routes/home.tsx`)

The only route (`index("routes/home.tsx")`). Layout: full-viewport centered card
(`bg-white`, rounded, padded) floating over the `<Particles />` animated
background (already exists in `app/components/elements/Particles.tsx` — keep
it).

### 3.1. Search controls (top row of the card)

1. **Search input** — reuse `~/components/common/SearchInput`. Free text, bound
   to `q`.
2. **Search button** — shadcn `Button` next to the input; explicit submit
   triggers a fresh search (resets to page 1). Pressing Enter in the input
   behaves the same.
3. **Gender filter** — shadcn `DropdownMenu` (radio group) with options **Male**
   and **Female**, plus a way to clear (send `"all"`/`""`). **Send lowercase
   values to the API** (`"male"` / `"female"`) — the server rejects
   `"Male"`/`"Female"` with a 400.
4. **Job start date range filter** — reuse `~/components/common/RangePicker`
   (two-date range via `react-day-picker`). Selected range maps to `startDate`
   (`from`) and `endDate` (`to`), formatted `YYYY-MM-DD` with `date-fns`. When
   only `from` is set, send only `startDate`. An empty/undefined range sends
   neither param.
5. **Job start date sort** — control (dropdown) over `job_start_date` with two
   directions:
   - **Newest to oldest** → `sortBy=job_start_date&sortOrder=desc`
   - **Oldest to newest** → `sortBy=job_start_date&sortOrder=asc`

### 3.2. Query behavior

- Changing the search text (submitted), gender, date range, or sort order
  **resets pagination to page 1** and refetches.
- All filter values live in React state (or the URL search string — either is
  acceptable; keep it consistent).
- Use a single `useInfiniteQuery` keyed on
  `[q, gender, startDate, endDate, sortBy, sortOrder]` so filter changes create
  a fresh query.
- Fetch on mount with the default (empty) filters — the list is populated before
  any search.

### 3.3. Infinite user list

- Rendered below the controls inside the card: a **virtualized infinite list of
  user cards** using `react-window` + `useInfiniteQuery`.
- Each page from the server appends to the list; when the user scrolls near the
  end, fetch the next page (`fetchNextPage`). Show a loading indicator at the
  list tail while fetching and a "no more results" state when `!hasNextPage`.
- The list must virtualize (only render visible rows) since the dataset is 300
  users.
- **Card contents** (from `UserSummaryItem`): full name, gender, job title,
  company name, job start date (formatted for display with `date-fns`),
  location, skills (truncate to a few chips), summary (clamped to 2–3 lines),
  and the LinkedIn URL as a clickable link opening in a new tab
  (`target="_blank" rel="noopener noreferrer"`, prefixed with `https://`).
- Handle per-field nulls (e.g. "—" or omit the row).

### 3.4. States

- **Loading (initial)**: skeleton cards or spinner.
- **Error**: message with a retry button (e.g. `refetch`); never crash on a
  failed request.
- **Empty result**: friendly "no results" message when `total === 0`.

---

## 4. Existing components — reuse, do not re-create

```text
client/app/
├── root.tsx                      # App shell, fonts, global CSS — already done
├── routes.ts                     # index("routes/home.tsx") — already done
├── routes/home.tsx               # THE page to build out (currently only renders controls)
├── components/
│   ├── common/SearchInput.tsx    # Search input (value/onChange, resultsCount prop)
│   ├── common/RangePicker.tsx    # Date-range picker (value/onChange DateRange, optional label)
│   ├── elements/Particles.tsx    # Animated background
│   └── ui/*                      # shadcn: Button, Input, DropdownMenu, Popover, Calendar, Field, etc.
└── lib/utils.ts                  # cn() helper
```

New code should add: React Query provider setup (`QueryClientProvider`, e.g. in
`root.tsx` or a `providers` component), an API layer (typed fetch wrapper +
`UserSummaryItem` / `SearchUsersResponse` types), the virtualized list
component, and the user card component.

---
