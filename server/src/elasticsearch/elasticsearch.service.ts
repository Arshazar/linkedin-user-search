import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ElasticsearchService as NestElasticClient } from '@nestjs/elasticsearch';
import {
  LINKEDIN_USERS_INDEX,
  LINKEDIN_USERS_INDEX_MAPPINGS,
} from './elasticsearch.constants';

export interface ElasticsearchUserDoc {
  id: string;
  linkedin_id?: string | null;
  full_name: string;
  gender?: string | null;
  job_title?: string | null;
  job_company_name?: string | null;
  job_start_date?: string | null;
  skills?: string[] | string;
  location_name?: string | null;
  summary?: string | null;
  linkedin_url?: string | null;
  linkedin_connections?: number | null;
  inferred_years_experience?: number | null;
}

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);

  constructor(private readonly esClient: NestElasticClient) {}

  async onModuleInit() {
    try {
      await this.initIndexIfNotExists();
    } catch (err: any) {
      this.logger.warn(`Elasticsearch initialization deferred: ${err.message}`);
    }
  }

  async ping(): Promise<boolean> {
    try {
      const isAlive = await this.esClient.ping();
      return !!isAlive;
    } catch {
      return false;
    }
  }

  async initIndexIfNotExists(): Promise<void> {
    const exists = await this.esClient.indices.exists({
      index: LINKEDIN_USERS_INDEX,
    });

    if (!exists) {
      this.logger.log(`Creating Elasticsearch index "${LINKEDIN_USERS_INDEX}"...`);
      await this.esClient.indices.create({
        index: LINKEDIN_USERS_INDEX,
        body: {
          mappings: LINKEDIN_USERS_INDEX_MAPPINGS,
        },
      });
      this.logger.log(`Elasticsearch index "${LINKEDIN_USERS_INDEX}" created.`);
    } else {
      this.logger.log(`Elasticsearch index "${LINKEDIN_USERS_INDEX}" already exists.`);
    }
  }

  async bulkIndexUsers(users: ElasticsearchUserDoc[]): Promise<number> {
    if (!users.length) return 0;

    const operations = users.flatMap((doc) => [
      { index: { _index: LINKEDIN_USERS_INDEX, _id: doc.id } },
      doc,
    ]);

    const response = await this.esClient.bulk({
      refresh: true,
      operations,
    });

    if (response.errors) {
      const erroredDocuments: any[] = [];
      response.items.forEach((action: any, i: number) => {
        const operation = Object.keys(action)[0];
        if (action[operation].error) {
          erroredDocuments.push({
            status: action[operation].status,
            error: action[operation].error,
            docId: users[Math.floor(i / 2)]?.id,
          });
        }
      });
      this.logger.error(
        `Bulk indexing completed with ${erroredDocuments.length} errors: ${JSON.stringify(erroredDocuments.slice(0, 3))}`,
      );
    }

    return users.length;
  }

  async search(queryBody: Record<string, any>): Promise<{
    total: number;
    hits: Array<{ _id: string; _score: number | null; _source: ElasticsearchUserDoc }>;
  }> {
    const response = await this.esClient.search<ElasticsearchUserDoc>({
      index: LINKEDIN_USERS_INDEX,
      ...queryBody,
    });

    const rawTotal = response.hits.total;
    const total = typeof rawTotal === 'number' ? rawTotal : rawTotal?.value ?? 0;

    const hits = (response.hits.hits || []).map((hit) => ({
      _id: hit._id as string,
      _score: hit._score ?? null,
      _source: hit._source as ElasticsearchUserDoc,
    }));

    return { total, hits };
  }
}
