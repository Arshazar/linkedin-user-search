import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '../elasticsearch/elasticsearch.module';
import { HealthController } from './health.controller';

@Module({
  imports: [ElasticsearchModule],
  controllers: [HealthController],
})
export class HealthModule {}
