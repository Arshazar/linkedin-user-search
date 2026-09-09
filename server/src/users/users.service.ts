import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { SearchUsersDto } from './dto/search-users.dto';
import { SearchUsersResponse, UserSummaryItem } from './dto/user-response.dto';
import { SearchQueryBuilder } from './search-query.builder';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  /**
   * Search users using Elasticsearch with full-text, filters, and pagination.
   */
  async search(dto: SearchUsersDto): Promise<SearchUsersResponse> {
    const page = Math.max(1, dto.page || 1);
    const limit = Math.max(1, Math.min(100, dto.limit || 20));

    try {
      const queryBody = SearchQueryBuilder.build(dto);
      const { total, hits } = await this.elasticsearchService.search(queryBody);

      const data: UserSummaryItem[] = hits.map((hit) => {
        const src = hit._source;
        return {
          id: src.id || hit._id,
          linkedinId: src.linkedin_id || null,
          fullName: src.full_name,
          gender: src.gender || null,
          jobTitle: src.job_title || null,
          jobCompanyName: src.job_company_name || null,
          jobStartDate: src.job_start_date || null,
          locationName: src.location_name || null,
          skills: Array.isArray(src.skills) ? src.skills : [],
          summary: src.summary || null,
          linkedinUrl: src.linkedin_url || null,
        };
      });

      const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

      return {
        total,
        page,
        limit,
        totalPages,
        data,
      };
    } catch (err: any) {
      this.logger.warn(`Elasticsearch query failed, falling back to PostgreSQL: ${err.message}`);
      return this.searchPostgresFallback(dto);
    }
  }

  /**
   * PostgreSQL fallback when Elasticsearch is unavailable.
   */
  private async searchPostgresFallback(dto: SearchUsersDto): Promise<SearchUsersResponse> {
    const page = Math.max(1, dto.page || 1);
    const limit = Math.max(1, Math.min(100, dto.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.userRepository.createQueryBuilder('user');

    if (dto.q && dto.q.trim().length > 0) {
      qb.andWhere(
        '(user.full_name ILIKE :q OR user.job_title ILIKE :q OR user.job_company_name ILIKE :q OR user.location_name ILIKE :q)',
        { q: `%${dto.q.trim()}%` },
      );
    }

    if (dto.gender && dto.gender !== 'all' && dto.gender.trim().length > 0) {
      qb.andWhere('user.gender = :gender', {
        gender: dto.gender.trim().toLowerCase(),
      });
    }

    if (dto.startDate) {
      qb.andWhere('user.job_start_date >= :startDate', {
        startDate: dto.startDate.trim(),
      });
    }

    if (dto.endDate) {
      qb.andWhere('user.job_start_date <= :endDate', {
        endDate: dto.endDate.trim(),
      });
    }

    const sortOrder = (dto.sortOrder || 'desc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy('user.job_start_date', sortOrder, 'NULLS LAST');

    qb.skip(skip).take(limit);

    const [users, total] = await qb.getManyAndCount();

    const data: UserSummaryItem[] = users.map((u) => ({
      id: u.id,
      linkedinId: u.linkedin_id,
      fullName: u.full_name,
      gender: u.gender,
      jobTitle: u.job_title,
      jobCompanyName: u.job_company_name,
      jobStartDate: u.job_start_date,
      locationName: u.location_name,
      skills: Array.isArray(u.skills) ? u.skills : [],
      summary: u.summary,
      linkedinUrl: u.linkedin_url,
    }));

    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

    return {
      total,
      page,
      limit,
      totalPages,
      data,
    };
  }

  /**
   * Retrieves full detailed user profile from PostgreSQL.
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return user;
  }
}
