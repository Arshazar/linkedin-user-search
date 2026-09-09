export interface UserSummaryItem {
  id: string;
  linkedinId: string | null;
  fullName: string;
  gender: string | null;
  jobTitle: string | null;
  jobCompanyName: string | null;
  jobStartDate: string | null;
  locationName: string | null;
  skills: string[];
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
