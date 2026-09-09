const API_BASE_URL = "http://localhost:3000";

/** User summary item from §2.1 of client.md — every field except `id` and `fullName` is nullable. */
export interface UserSummaryItem {
  id: string;
  linkedinId: string | null;
  fullName: string;
  gender: string | null;
  jobTitle: string | null;
  jobCompanyName: string | null;
  jobStartDate: string | null;
  locationName: string | null;
  skills: string[] | null;
  summary: string | null;
  linkedinUrl: string | null;
}

export interface SearchUsersResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: UserSummaryItem[];
}

export interface SearchUsersParams {
  q?: string;
  gender?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

export class ApiError extends Error {
  status: number;
  url: string;

  constructor(status: number, url: string, message?: string) {
    super(message || `Request to ${url} failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.url = url;
  }
}

export async function searchUsers(
  params: SearchUsersParams = {},
): Promise<SearchUsersResponse> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }

  const url = `${API_BASE_URL}/api/users/search${search.size > 0 ? `?${search}` : ""}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new ApiError(response.status, url);
  }

  return (await response.json()) as SearchUsersResponse;
}
