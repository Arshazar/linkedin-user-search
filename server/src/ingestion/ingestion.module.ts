import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from '../database/entities/user.entity';
import { ElasticsearchModule } from '../elasticsearch/elasticsearch.module';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { UserTransformerService } from './user-transformer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ElasticsearchModule,
    ConfigModule,
  ],
  controllers: [IngestionController],
  providers: [IngestionService, UserTransformerService],
  exports: [IngestionService],
})
export class IngestionModule {}
