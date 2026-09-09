import { SearchUsersDto } from './dto/search-users.dto';

export class SearchQueryBuilder {
  static build(dto: SearchUsersDto): Record<string, any> {
    const page = Math.max(1, dto.page || 1);
    const limit = Math.max(1, Math.min(100, dto.limit || 20));
    const from = (page - 1) * limit;

    const mustClauses: any[] = [];
    const filterClauses: any[] = [];

    // 1. Full-text search with boosts and typo tolerance
    if (dto.q && dto.q.trim().length > 0) {
      mustClauses.push({
        multi_match: {
          query: dto.q.trim(),
          fields: [
            'full_name^3',
            'job_title^2',
            'job_company_name^2',
            'skills^2',
            'summary^1',
            'location_name^1',
          ],
          fuzziness: 'AUTO',
        },
      });
    } else {
      mustClauses.push({ match_all: {} });
    }

    // 2. Gender filter — bypassed for 'all' or empty
    if (
      dto.gender &&
      dto.gender !== 'all' &&
      dto.gender.trim().length > 0
    ) {
      filterClauses.push({
        term: {
          gender: dto.gender.trim().toLowerCase(),
        },
      });
    }

    // 3. Date range filter (job_start_date)
    if (dto.startDate || dto.endDate) {
      const rangeClause: Record<string, any> = {};
      if (dto.startDate) {
        rangeClause.gte = dto.startDate.trim();
      }
      if (dto.endDate) {
        rangeClause.lte = dto.endDate.trim();
      }
      filterClauses.push({
        range: {
          job_start_date: rangeClause,
        },
      });
    }

    // 4. Sorting — relevance when a text query is present without an
    //    explicit sort, otherwise job_start_date
    const hasQuery = !!(dto.q && dto.q.trim().length > 0);
    const effectiveSortBy = dto.sortBy ?? (hasQuery ? '_score' : 'job_start_date');

    const sortClauses: any[] = [];
    if (effectiveSortBy === '_score') {
      sortClauses.push({ _score: { order: dto.sortOrder || 'desc' } });
    } else {
      sortClauses.push({
        job_start_date: {
          order: dto.sortOrder || 'desc',
          missing: '_last',
        },
      });
    }

    return {
      from,
      size: limit,
      query: {
        bool: {
          must: mustClauses,
          filter: filterClauses,
        },
      },
      sort: sortClauses,
    };
  }
}
