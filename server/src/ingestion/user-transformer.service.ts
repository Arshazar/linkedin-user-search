import { Injectable } from '@nestjs/common';
import { User } from '../database/entities/user.entity';
import { ElasticsearchUserDoc } from '../elasticsearch/elasticsearch.service';
import { normalizeDate } from './utils/date-normalizer.util';
import {
  sanitizePythonLiteral,
  sanitizeSkills,
} from './utils/python-sanitizer.util';

@Injectable()
export class UserTransformerService {
  /**
   * Transforms a raw CSV row into a PostgreSQL User entity instance.
   */
  transformToEntity(row: Record<string, any>, generatedId: string): User {
    const user = new User();
    user.id = generatedId;

    // Detect if this row has shifted columns (where location_name contains experience)
    const isShifted =
      row.location_name &&
      typeof row.location_name === 'string' &&
      (row.location_name.includes("'company':") ||
        row.location_name.includes('"company":'));

    if (isShifted) {
      this.populateShiftedRow(user, row);
    } else {
      this.populateStandardRow(user, row);
    }

    user.raw_data = row;
    return user;
  }

  /**
   * Populates entity from standard row.
   */
  private populateStandardRow(user: User, row: Record<string, any>): void {
    user.full_name = (row.full_name || '').trim();
    user.first_name = row.first_name ? row.first_name.trim() : null;
    user.last_name = row.last_name ? row.last_name.trim() : null;
    user.gender = this.normalizeGender(row.gender);
    user.linkedin_id = row.linkedin_id ? String(row.linkedin_id).trim() : null;
    user.linkedin_url = row.linkedin_url ? row.linkedin_url.trim() : null;
    user.industry = row.industry ? row.industry.trim() : null;
    user.job_title = row.job_title ? row.job_title.trim() : null;
    user.job_company_name = row.job_company_name
      ? row.job_company_name.trim()
      : null;
    user.job_start_date = normalizeDate(row.job_start_date);
    user.location_name = row.location_name ? row.location_name.trim() : null;
    user.summary = row.summary ? row.summary.trim() : null;

    user.skills = sanitizeSkills(row.skills);
    user.emails = sanitizePythonLiteral(row.emails, []);
    user.phone_numbers = sanitizePythonLiteral(row.phone_numbers, []);
    user.experience = sanitizePythonLiteral(row.experience, []);
    user.education = sanitizePythonLiteral(row.education, []);
  }

  /**
   * Populates entity when columns are shifted due to missing export fields.
   */
  private populateShiftedRow(user: User, row: Record<string, any>): void {
    user.full_name = (row.full_name || '').trim();
    user.first_name = row.first_name ? row.first_name.trim() : null;
    user.last_name = row.last_name ? row.last_name.trim() : null;
    user.gender = this.normalizeGender(row.gender);
    user.linkedin_id = row.linkedin_id ? String(row.linkedin_id).trim() : null;
    user.linkedin_url = row.linkedin_url ? row.linkedin_url.trim() : null;

    user.industry = row.facebook_url ? row.facebook_url.trim() : null;
    user.job_title = row.facebook_username ? row.facebook_username.trim() : null;
    user.job_company_name = row.job_title ? row.job_title.trim() : null;
    user.job_start_date = normalizeDate(row.job_title_levels);
    user.location_name = row.job_company_id ? row.job_company_id.trim() : null;
    user.summary = row.job_company_location_name
      ? row.job_company_location_name.trim()
      : null;

    user.phone_numbers = sanitizePythonLiteral(row.job_company_location_locality, []);
    user.emails = sanitizePythonLiteral(row.job_company_location_metro, []);
    user.skills = sanitizeSkills(row.job_company_location_geo);
    user.experience = sanitizePythonLiteral(row.location_name, []);
    user.education = sanitizePythonLiteral(row.location_locality, []);
  }

  /**
   * Transforms a User entity and raw row into an Elasticsearch search document.
   */
  transformToElasticDoc(
    user: User,
    row: Record<string, any>,
  ): ElasticsearchUserDoc {
    const rawConn =
      row.linkedin_connections ||
      (row.location_name && row.location_name.includes("'company':")
        ? row.job_company_linkedin_id
        : null);

    const rawExp =
      row.inferred_years_experience ||
      (row.location_name && row.location_name.includes("'company':")
        ? row.job_company_twitter_url
        : null);

    const connectionsNum = rawConn
      ? Math.round(parseFloat(String(rawConn).replace(/,/g, '')))
      : null;

    const experienceNum = rawExp ? parseFloat(String(rawExp)) : null;

    return {
      id: user.id,
      linkedin_id: user.linkedin_id,
      full_name: user.full_name,
      gender: user.gender,
      job_title: user.job_title,
      job_company_name: user.job_company_name,
      job_start_date: user.job_start_date,
      skills: user.skills,
      location_name: user.location_name,
      summary: user.summary,
      linkedin_url: user.linkedin_url,
      linkedin_connections: isNaN(connectionsNum as number)
        ? null
        : connectionsNum,
      inferred_years_experience: isNaN(experienceNum as number)
        ? null
        : experienceNum,
    };
  }

  /**
   * Normalizes gender string to 'male', 'female', or null.
   */
  private normalizeGender(gender?: string | null): string | null {
    if (!gender || typeof gender !== 'string') return null;
    const lower = gender.trim().toLowerCase();
    if (lower === 'male' || lower === 'female') return lower;
    return null;
  }
}
