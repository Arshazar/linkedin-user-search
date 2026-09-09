import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
@Index('idx_users_full_name', ['full_name'])
@Index('idx_users_gender', ['gender'])
@Index('idx_users_job_start_date', ['job_start_date'])
@Index('idx_users_job_company_name', ['job_company_name'])
// GIN index on skills is created via SQL in database.module.ts —
// TypeORM decorator sync does not support GIN.
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  linkedin_id!: string | null;

  @Column({ type: 'text' })
  full_name!: string;

  @Column({ type: 'text', nullable: true })
  first_name!: string | null;

  @Column({ type: 'text', nullable: true })
  last_name!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gender!: string | null;

  @Column({ type: 'text', nullable: true })
  job_title!: string | null;

  @Column({ type: 'text', nullable: true })
  job_company_name!: string | null;

  @Column({ type: 'date', nullable: true })
  job_start_date!: string | null;

  @Column({ type: 'text', nullable: true })
  industry!: string | null;

  @Column({ type: 'text', nullable: true })
  location_name!: string | null;

  @Column({ type: 'text', nullable: true })
  linkedin_url!: string | null;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  skills!: string[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  emails!: unknown[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  phone_numbers!: unknown[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  experience!: unknown[];

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  education!: unknown[];

  @Column({ type: 'jsonb', nullable: true })
  raw_data!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updated_at!: Date;
}
