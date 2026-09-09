# Server Specification & Architecture Guide

This document provides the complete, unambiguous technical specification for the
server application in `/server`. It is structured to serve as an authoritative
reference for AI coding agents and developers implementing the backend.

---

## 1. System Overview

The server is a high-performance REST API built with **NestJS (TypeScript)**.
Its purpose is to:

1. **Ingest & ETL**: Parse and sanitize `300 user linkedin.csv` located at the
   root of the project (`../300 user linkedin.csv` relative to `/server`).
2. **Dual-Store Persistence**:
   - **PostgreSQL**: Serves as the primary relational database storing
     normalized profiles with B-Tree indexes on frequently filtered/joined
     columns.
   - **Elasticsearch**: Serves as the full-text search engine and filtering
     index for ultra-fast multi-field matching, fuzzy search, and range
     filtering.
3. **API Serving**: Expose endpoints for the frontend (React Router client in
   `/client`), supporting virtualized infinite scroll, text search, gender
   filtering, job start date filtering/sorting, and detailed profile viewing.

---

## 2. Architecture & Data Flow

```text
         ┌───────────────────────────────┐
         │   300 user linkedin.csv       │
         │   (Root Directory)            │
         └──────────────┬────────────────┘
                        │
                        ▼
         ┌───────────────────────────────┐
         │   ETL / Ingestion Pipeline    │
         │   - CSV streaming parser      │
         │   - Python literal sanitizer  │
         │   - Date & type normalizer    │
         └───────┬───────────────┬───────┘
                 │               │
  (Write/Persist)│               │(Bulk Index)
                 ▼               ▼
  ┌────────────────────┐   ┌────────────────────┐
  │    PostgreSQL      │   │   Elasticsearch    │
  │   - Full schema    │   │   - Search index   │
  │   - B-Tree indexes │   │   - Analyzers      │
  └─────────┬──────────┘   └─────────┬──────────┘
            │                        │
(Profile    │                        │ (Fast Multi-field
 hydration) │                        │  Search & Filters)
            ▼                        ▼
         ┌───────────────────────────────┐
         │      NestJS REST API          │
         │      (/server)                │
         └──────────────▲────────────────┘
                        │ HTTP
                        │ (Search, Filter, Pagination)
         ┌──────────────┴────────────────┐
         │    React Frontend Client      │
         │    (/client)                  │
         └───────────────────────────────┘
```

---

## 3. Technology Stack

- **Framework**: [NestJS](https://nestjs.com/) (Node.js v18+, TypeScript)
- **Search Engine**:
  [Elasticsearch 8.x](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
  (`@nestjs/elasticsearch` or `@elastic/elasticsearch`)
- **Primary Database**: [PostgreSQL 16+](https://www.postgresql.org/)
- **ORM / Database Access**: TypeORM or Prisma (TypeORM recommended for
  idiomatic NestJS integration)
- **CSV Ingestion**: `csv-parser` or `papaparse` with streaming support
- **Infrastructure / Local Dev**: Docker & Docker Compose (`docker-compose.yml`)

---

## 4. Ingestion & ETL Pipeline

### 4.1. Source File

- **Location**: `../300 user linkedin.csv` (relative to `/server`)
- **Format**: CSV with 358 lines, 77 columns per row.
- **Trigger**: Run via a CLI seed command (`npm run seed`) or on application
  bootstrap if the database is uninitialized.

### 4.2. Data Sanitization & Cleaning Challenges

The source CSV contains Python-serialized objects and inconsistent formats that
require explicit sanitization before insertion:

1. **Python Literals to Valid JSON**:
   - Columns like `emails`, `phone_numbers`, `skills`, `interests`,
     `experience`, `education`, `location_names`, `street_addresses`, `profiles`
     use Python dictionary/list syntax:
     - Single quotes (`'`) instead of double quotes (`"`).
     - Python booleans/nulls: `None` -> `null`, `True` -> `true`, `False` ->
       `false`.
   - **Sanitizer Rule**: Implement a parser/transformer to convert Python
     stringified literals into valid JSON strings before parsing or storing in
     `JSONB`.

2. **Date Normalization**:
   - `job_start_date` varies in format across rows:
     - `YYYY` (e.g., `2005`) -> Normalize to `2005-01-01`
     - `YYYY-MM` (e.g., `2019-10`) -> Normalize to `2019-10-01`
     - `YYYY-MM-DD` (e.g., `2015-10-01`) -> Normalize to `2015-10-01`
     - Empty string / null -> Store as `NULL`
   - All dates must be cast to ISO `Date` or `YYYY-MM-DD` for valid PostgreSQL
     `DATE` types and Elasticsearch `date` mapping.

3. **Gender Normalization**:
   - Case-insensitive trimming: `"male"`, `"Male"`, `"female"`, `"Female"`.
   - Normalize to lowercase: `"male"`, `"female"`, or `null` if unpopulated.

4. **Numeric & Array Types**:
   - `linkedin_connections`: parse float string (e.g., `"3761.0"`) to `integer`
     (`3761`).
   - `inferred_years_experience`: parse float string (e.g., `"12.0"`) to `float`
     / `decimal`.
   - `skills`: parsed from string array e.g. `['recruiting', 'leadership']` into
     a clean array of strings `string[]`.

---

## 5. Storage Schemas & Indexing

### 5.1. PostgreSQL Schema (`users` Table)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    linkedin_id VARCHAR(255) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    gender VARCHAR(50),
    job_title VARCHAR(255),
    job_company_name VARCHAR(255),
    job_start_date DATE,
    industry VARCHAR(255),
    location_name VARCHAR(255),
    linkedin_url VARCHAR(500),
    summary TEXT,
    skills JSONB DEFAULT '[]'::jsonb,
    emails JSONB DEFAULT '[]'::jsonb,
    phone_numbers JSONB DEFAULT '[]'::jsonb,
    experience JSONB DEFAULT '[]'::jsonb,
    education JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB, -- Stores complete original 77-column row attributes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Essential Performance Indexes
CREATE INDEX idx_users_full_name ON users(full_name);
CREATE INDEX idx_users_gender ON users(gender);
CREATE INDEX idx_users_job_start_date ON users(job_start_date);
CREATE INDEX idx_users_job_company_name ON users(job_company_name);
CREATE INDEX idx_users_skills_gin ON users USING GIN (skills);
```

### 5.2. Elasticsearch Index Mapping (`linkedin_users`)

Index Name: `linkedin_users`

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "linkedin_id": { "type": "keyword" },
      "full_name": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "gender": { "type": "keyword" },
      "job_title": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "job_company_name": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "job_start_date": {
        "type": "date",
        "format": "yyyy-MM-dd||yyyy-MM||yyyy||epoch_millis"
      },
      "skills": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "location_name": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "summary": { "type": "text" },
      "linkedin_url": { "type": "keyword" },
      "linkedin_connections": { "type": "integer" },
      "inferred_years_experience": { "type": "float" }
    }
  }
}
```

---

## 6. Search Strategy & Query Construction

When the frontend sends a query:

1. **Elasticsearch Execution**:
   - **Text Query (`q`)**: Multi-match across:
     - `full_name^3` (boosted)
     - `job_title^2`
     - `job_company_name^2`
     - `skills^2`
     - `summary^1`
     - `location_name^1`
     - Uses `fuzziness: "AUTO"` to handle typos.
   - **Gender Filter (`gender`)**: Term filter on `gender.keyword` (`male` or
     `female`). If `all` or omitted, filter is bypassed.
   - **Job Start Date Filter (`startDate`, `endDate`)**: Range query on
     `job_start_date` (`gte` and `lte`).
   - **Sorting**:
     - By `job_start_date`: `asc` (oldest to newest) or `desc` (newest to
       oldest).
     - By `relevance`: `_score` descending when a text query `q` is provided
       without an explicit date sort.
   - **Pagination**: Uses `from` (offset) and `size` (limit) to support
     virtualized windowing (`react-window`).

2. **Result Delivery**:
   - For search results, the server can either return the indexed fields
     directly from Elasticsearch hits for minimal latency, or hydrate full
     relational data from PostgreSQL using the matching IDs.

---

## 7. REST API Endpoints Specification

### 7.1. Search Users

- **Method**: `GET`
- **Path**: `/api/users/search`
- **Query Parameters**:
  | Param       | Type     | Required | Default            | Description                                           |
  | ----------- | -------- | -------- | ------------------ | ----------------------------------------------------- |
  | `q`         | `string` | No       | `""`               | Free-text search query (name, title, skills, company) |
  | `gender`    | `string` | No       | `""`               | Filter by `"male"` or `"female"`                      |
  | `startDate` | `string` | No       | `null`             | ISO date start range (e.g. `"2010-01-01"`)            |
  | `endDate`   | `string` | No       | `null`             | ISO date end range (e.g. `"2020-12-31"`)              |
  | `sortBy`    | `string` | No       | `"job_start_date"` | Sort field: `"job_start_date"` or `"_score"`          |
  | `sortOrder` | `string` | No       | `"desc"`           | Sort direction: `"asc"` or `"desc"`                   |
  | `page`      | `number` | No       | `1`                | Page number (1-based index)                           |
  | `limit`     | `number` | No       | `20`               | Items per page (supports infinite list batch size)    |

- **Response `200 OK`**:

```json
{
  "total": 300,
  "page": 1,
  "limit": 20,
  "totalPages": 15,
  "data": [
    {
      "id": "a59e1208-8dfa-4952-b8f2-bb4faea63d91",
      "linkedinId": "47878127",
      "fullName": "Joseph Holland",
      "gender": "male",
      "jobTitle": "Recruiting Manager",
      "jobCompanyName": "Garver",
      "jobStartDate": "2019-10-01",
      "locationName": "Denton, Texas, United States",
      "skills": ["recruiting", "leadership", "human resources"],
      "summary": "Celebrating its 100th year...",
      "linkedinUrl": "linkedin.com/in/joeyholland"
    }
  ]
}
```

### 7.2. Get User Details

- **Method**: `GET`
- **Path**: `/api/users/:id`
- **Response `200 OK`**: Complete profile entity from PostgreSQL including
  `experience`, `education`, `emails`, `phone_numbers`, and social links.

### 7.3. Health & Readiness

- **Method**: `GET`
- **Path**: `/api/health`
- **Response `200 OK`**: Connection status of PostgreSQL and Elasticsearch.

### 7.4. Ingestion Trigger (Admin / Dev)

- **Method**: `POST`
- **Path**: `/api/ingestion/seed`
- **Response `200 OK`**: Ingestion status, processed records count, and
  execution time.

---

## 8. Directory & Module Structure

When generating the server in `/server`, adhere to the standard NestJS modular
architecture:

```text
server/
├── docker-compose.yml       # PostgreSQL and Elasticsearch container definitions
├── .env.example             # Documented environment variables
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts              # NestJS entry point (enables CORS, ValidationPipe)
    ├── app.module.ts        # Root module importing feature modules
    ├── config/              # Environment config validation (Joi or @nestjs/config)
    ├── database/            # PostgreSQL configuration, TypeORM entities & migrations
    │   ├── database.module.ts
    │   └── entities/
    │       └── user.entity.ts
    ├── elasticsearch/       # Elasticsearch client wrapper & index setup
    │   ├── elasticsearch.module.ts
    │   └── elasticsearch.service.ts
    ├── ingestion/           # CSV ETL parser & batch synchronization
    │   ├── ingestion.module.ts
    │   ├── ingestion.service.ts
    │   ├── csv-parser.util.ts
    │   └── seed.ts          # CLI runner: npm run seed
    └── users/               # REST API Module
        ├── users.module.ts
        ├── users.controller.ts
        ├── users.service.ts
        └── dto/
            ├── search-users.dto.ts
            └── user-response.dto.ts
```

---

## 9. Docker & Environment Configuration

### 9.1. `docker-compose.yml` (located in `/server`)

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    container_name: linkedin_user_search_postgres
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
      POSTGRES_DB: linkedin_user_search
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: linkedin_user_search_elasticsearch
    restart: always
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data

volumes:
  postgres_data:
  es_data:
```

### 9.2. `.env` Configuration

```env
PORT=3000
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/linkedin_user_search
ELASTICSEARCH_NODE=http://localhost:9200
CSV_FILE_PATH=../300 user linkedin.csv
```

---

## 10. AI Implementation Step-by-Step Checklist

When tasked with generating or modifying the `/server` codebase, execute the
following steps in order:

1. **Step 1: Project Initialization**: Initialize NestJS project in `/server`,
   configure TypeScript, install dependencies (`@nestjs/typeorm`, `typeorm`,
   `pg`, `@nestjs/elasticsearch`, `@elastic/elasticsearch`, `class-validator`,
   `class-transformer`, `csv-parser`).
2. **Step 2: Containers Setup**: Create `docker-compose.yml` and `.env.example`.
3. **Step 3: Database & Entity Setup**: Implement `User` entity in PostgreSQL
   with column definitions and explicit indexes on `full_name`, `gender`,
   `job_start_date`, and `job_company_name`.
4. **Step 4: Elasticsearch Setup**: Implement `ElasticsearchService` to verify
   connectivity, initialize the `linkedin_users` index with mappings, and
   provide search/bulk-insert methods.
5. **Step 5: ETL Ingestion Implementation**: Build the CSV streaming reader and
   string-sanitizer for Python literals. Create an idempotent `npm run seed`
   command that populates Postgres and bulk-indexes into Elasticsearch.
6. **Step 6: REST Controller & Service**:
   - Implement `GET /api/users/search` with DTO validation (`SearchUsersDto`).
   - Implement query builder executing full-text multi-match, gender filter,
     date range filter, sort, and pagination.
   - Enable CORS for `http://localhost:5173` (or client port).
7. **Step 7: Verification**: Test search with text query, gender filtering
   (`male`/`female`), date range, and ensure pagination matches client
   expectation (`resultsCount` and list).
