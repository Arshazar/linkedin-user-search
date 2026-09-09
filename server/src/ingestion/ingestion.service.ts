import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import { createHash, randomUUID } from 'crypto';
import { User } from '../database/entities/user.entity';
import {
  ElasticsearchService,
  ElasticsearchUserDoc,
} from '../elasticsearch/elasticsearch.service';
import { parseLinkedInCsv } from './utils/csv-parser.util';
import { UserTransformerService } from './user-transformer.service';

export interface IngestionResult {
  status: string;
  totalParsed: number;
  persistedCount: number;
  indexedCount: number;
  durationMs: number;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly elasticsearchService: ElasticsearchService,
    private readonly transformerService: UserTransformerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Resolves the CSV path relative to server root or environment configuration.
   */
  resolveCsvPath(customPath?: string): string {
    if (customPath && fs.existsSync(customPath)) {
      return customPath;
    }

    const envPath = this.configService.get<string>(
      'CSV_FILE_PATH',
      '../300 user linkedin.csv',
    );

    const candidates = [
      envPath,
      path.resolve(process.cwd(), envPath),
      path.resolve(__dirname, '../../..', '300 user linkedin.csv'),
      path.resolve(__dirname, '../../../..', '300 user linkedin.csv'),
      path.resolve(process.cwd(), '../300 user linkedin.csv'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error(
      `CSV source file could not be found. Checked paths: ${candidates.join(', ')}`,
    );
  }

  /**
   * Runs the complete ETL ingestion pipeline idempotently:
   * 1. Ensure Elasticsearch index exists
   * 2. Parse and sanitize CSV
   * 3. Fetch existing users from PostgreSQL to update instead of conflict
   * 4. Persist to PostgreSQL in batches
   * 5. Bulk index to Elasticsearch
   */
  async runIngestion(customPath?: string): Promise<IngestionResult> {
    const startTime = Date.now();
    const resolvedPath = this.resolveCsvPath(customPath);
    this.logger.log(`Starting ingestion from CSV: ${resolvedPath}`);

    // Ensure Elasticsearch index is ready
    await this.elasticsearchService.initIndexIfNotExists();

    // Parse CSV records
    const rawRows = await parseLinkedInCsv(resolvedPath);
    this.logger.log(`Successfully parsed ${rawRows.length} valid records from CSV.`);

    // Load existing users for idempotent updates
    const existingUsers = await this.userRepository.find({
      select: ['id', 'linkedin_id', 'full_name'],
    });
    const existingByLinkedinId = new Map<string, string>();
    const existingByName = new Map<string, string>();

    for (const u of existingUsers) {
      if (u.linkedin_id) existingByLinkedinId.set(u.linkedin_id, u.id);
      if (u.full_name) existingByName.set(u.full_name.toLowerCase(), u.id);
    }

    const userEntities: User[] = [];
    const esDocuments: ElasticsearchUserDoc[] = [];
    const seenLinkedinIds = new Set<string>();

    for (const row of rawRows) {
      let linkedinId = row.linkedin_id ? String(row.linkedin_id).trim() : null;
      if (linkedinId && seenLinkedinIds.has(linkedinId)) {
        // Deterministic suffix: same duplicate row -> same key across re-seeds
        linkedinId = `${linkedinId}_dup${createHash('sha1')
          .update(String(row.full_name || ''))
          .digest('hex')
          .slice(0, 8)}`;
        row.linkedin_id = linkedinId;
      } else if (linkedinId) {
        seenLinkedinIds.add(linkedinId);
      }

      // Determine entity ID (reuse existing if match found for idempotency)
      let existingId: string | undefined;
      if (linkedinId && existingByLinkedinId.has(linkedinId)) {
        existingId = existingByLinkedinId.get(linkedinId);
      } else if (row.full_name && existingByName.has(row.full_name.trim().toLowerCase())) {
        existingId = existingByName.get(row.full_name.trim().toLowerCase());
      }

      const id = existingId || randomUUID();
      const entity = this.transformerService.transformToEntity(row, id);
      const esDoc = this.transformerService.transformToElasticDoc(entity, row);

      userEntities.push(entity);
      esDocuments.push(esDoc);
    }

    // 1. Batch persist to PostgreSQL (chunks of 50)
    const BATCH_SIZE = 50;
    let persistedCount = 0;

    for (let i = 0; i < userEntities.length; i += BATCH_SIZE) {
      const chunk = userEntities.slice(i, i + BATCH_SIZE);
      await this.userRepository.save(chunk);
      persistedCount += chunk.length;
    }
    this.logger.log(`Persisted ${persistedCount} records to PostgreSQL.`);

    // 2. Bulk index into Elasticsearch (chunks of 100)
    let indexedCount = 0;
    const ES_BATCH_SIZE = 100;

    for (let i = 0; i < esDocuments.length; i += ES_BATCH_SIZE) {
      const chunk = esDocuments.slice(i, i + ES_BATCH_SIZE);
      const count = await this.elasticsearchService.bulkIndexUsers(chunk);
      indexedCount += count;
    }
    this.logger.log(`Indexed ${indexedCount} documents in Elasticsearch.`);

    const durationMs = Date.now() - startTime;
    this.logger.log(`Ingestion completed in ${durationMs}ms.`);

    return {
      status: 'completed',
      totalParsed: rawRows.length,
      persistedCount,
      indexedCount,
      durationMs,
    };
  }
}
