# LinkedIn Search Server

NestJS REST API backing the LinkedIn Search client: PostgreSQL for normalized
profile storage, Elasticsearch for fuzzy multi-field search.

## Stack

- NestJS 10 + TypeScript (strict)
- PostgreSQL 16 (TypeORM) — relational store
- Elasticsearch 8.11 — full-text search index
- Docker Compose for local Postgres + ES

## Setup

```bash
cd server
pnpm install
cp .env.example .env        # adjust values if needed
docker compose up -d        # Postgres (5432) + Elasticsearch (9200)
pnpm seed                   # ETL: CSV -> Postgres + Elasticsearch
pnpm start:dev              # http://localhost:3000
```

The seed reads `../300 user linkedin.csv` (path configurable via
`CSV_FILE_PATH`), sanitizes Python-literal columns, normalizes dates and
gender, upserts into Postgres (idempotent, keyed on `linkedin_id`), and bulk
indexes into the `linkedin_users` Elasticsearch index. Re-running produces no
duplicates.

## Scripts

| Script | Purpose |
|---|---|
| `pnpm start:dev` | Dev server with watch |
| `pnpm build` | Compile to `dist/` |
| `pnpm seed` | CLI ingestion runner |

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `3000` | HTTP port |
| `DATABASE_URL` | **yes** | — | Postgres connection string |
| `ELASTICSEARCH_NODE` | **yes** | — | Elasticsearch node URL |
| `CSV_FILE_PATH` | no | `../300 user linkedin.csv` | CSV source path |
| `CLIENT_ORIGIN` | no | `http://localhost:5173` | CORS origin for the client |

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/users/search` | Query: `q`, `gender` (`male`/`female`/`all`), `startDate`, `endDate`, `sortBy` (`job_start_date`/`_score`), `sortOrder`, `page`, `limit`. Returns `{ total, page, limit, totalPages, data }`. |
| GET | `/api/users/:id` | Full profile from Postgres (experience, education, emails, phones, raw_data). 404 on unknown id. |
| GET | `/api/health` | Postgres + Elasticsearch connection status. |
| POST | `/api/ingestion/seed` | Triggers ingestion; returns record counts and duration. |

Search runs as an Elasticsearch multi-match (`full_name^3`, `job_title^2`,
`job_company_name^2`, `skills^2`, `summary^1`, `location_name^1`,
`fuzziness: AUTO`) with term filter on gender, range filter on
`job_start_date`, and `from`/`size` pagination. Falls back to a Postgres
`ILIKE` query if Elasticsearch is unreachable.
