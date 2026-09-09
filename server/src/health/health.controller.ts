import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';

@Controller('api/health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly elasticsearchService: ElasticsearchService,
  ) {}

  @Get()
  async checkHealth() {
    let postgresHealthy = false;
    let elasticsearchHealthy = false;

    try {
      await this.dataSource.query('SELECT 1');
      postgresHealthy = true;
    } catch {
      postgresHealthy = false;
    }

    try {
      elasticsearchHealthy = await this.elasticsearchService.ping();
    } catch {
      elasticsearchHealthy = false;
    }

    const isHealthy = postgresHealthy && elasticsearchHealthy;

    return {
      status: isHealthy ? 'ok' : 'degraded',
      services: {
        postgres: postgresHealthy ? 'connected' : 'disconnected',
        elasticsearch: elasticsearchHealthy ? 'connected' : 'disconnected',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
