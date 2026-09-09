export const LINKEDIN_USERS_INDEX = 'linkedin_users';

export const LINKEDIN_USERS_INDEX_MAPPINGS = {
  properties: {
    id: { type: 'keyword' as const },
    linkedin_id: { type: 'keyword' as const },
    full_name: {
      type: 'text' as const,
      fields: {
        keyword: { type: 'keyword' as const },
      },
    },
    gender: { type: 'keyword' as const },
    job_title: {
      type: 'text' as const,
      fields: {
        keyword: { type: 'keyword' as const },
      },
    },
    job_company_name: {
      type: 'text' as const,
      fields: {
        keyword: { type: 'keyword' as const },
      },
    },
    job_start_date: {
      type: 'date' as const,
      format: 'yyyy-MM-dd||yyyy-MM||yyyy||epoch_millis',
    },
    skills: {
      type: 'text' as const,
      fields: {
        keyword: { type: 'keyword' as const },
      },
    },
    location_name: {
      type: 'text' as const,
      fields: {
        keyword: { type: 'keyword' as const },
      },
    },
    summary: { type: 'text' as const },
    linkedin_url: { type: 'keyword' as const },
    linkedin_connections: { type: 'long' as const },
    inferred_years_experience: { type: 'float' as const },
  },
};
