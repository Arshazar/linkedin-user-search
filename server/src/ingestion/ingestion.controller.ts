import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { IngestionService, IngestionResult } from './ingestion.service';

export class TriggerSeedDto {
  filePath?: string;
}

@Controller('api/ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async triggerSeed(@Body() dto?: TriggerSeedDto): Promise<IngestionResult> {
    return this.ingestionService.runIngestion(dto?.filePath);
  }
}
