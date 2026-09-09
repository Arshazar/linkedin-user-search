import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';

/**
 * TypeORM's decorator sync cannot create GIN indexes, so the skills
 * GIN index from server.md §5.1 is ensured manually on bootstrap.
 */
async function ensureSkillsGinIndex(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_users_skills_gin
    ON users USING GIN (skills)
  `);
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>(
          'DATABASE_URL',
          'postgresql://postgres:postgrespassword@localhost:5432/linkedin_search',
        ),
        entities: [User],
        synchronize: true, // auto-create schema & indexes
        logging: false,
      }),
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [
    {
      provide: 'DATABASE_BOOTSTRAP',
      useFactory: ensureSkillsGinIndex,
      inject: [DataSource],
    },
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
