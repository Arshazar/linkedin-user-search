# LinkedIn User Search

A full-stack application for searching LinkedIn user profiles. The monorepo
consists of two projects:

- **[client/](client/)** — front end built with the React Router framework
  (Vite, Tailwind CSS, shadcn/ui, TanStack Query)
- **[server/](server/)** — back end built with NestJS (TypeORM + PostgreSQL,
  Elasticsearch)

## Features

- Full-text search over LinkedIn user profiles via Elasticsearch
- PostgreSQL as the source of truth, with CSV ingestion for seeding data
- Hot-reloading dev setup for both client and server

## Project Structure

```
linkedin-user-search/
├── client/          # React Router (framework mode) front end
│   └── app/         # routes, components, styles
└── server/          # NestJS API
    └── src/
        ├── config/          # app configuration
        ├── database/        # TypeORM entities & migrations
        ├── elasticsearch/   # search index setup
        ├── ingestion/       # CSV import & seed script
        ├── users/           # users module & search endpoint
        └── health/          # health check endpoint
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (for PostgreSQL & Elasticsearch)

## Getting Started

### 1. Start the infrastructure

From the `server/` directory, start PostgreSQL and Elasticsearch:

```bash
cd server
docker compose up -d
```

This starts:

- PostgreSQL 16 on `localhost:5432`
- Elasticsearch 8.11 on `localhost:9200`

### 2. Set up the server

```bash
cd server
pnpm install
cp .env.example .env   # adjust values if needed
pnpm start:dev
```

The API runs on `http://localhost:3000` by default. To load the CSV dataset into
Postgres and index it in Elasticsearch:

```bash
pnpm seed
```

### 3. Set up the client

```bash
cd client
pnpm install
pnpm dev
```

The app runs on `http://localhost:5173` and talks to the API at
`http://localhost:3000`.

## Environment Variables (server)

| Variable             | Description                        | Default                                                                      |
| -------------------- | ---------------------------------- | ---------------------------------------------------------------------------- |
| `PORT`               | API port                           | `3000`                                                                       |
| `DATABASE_URL`       | PostgreSQL connection string       | `postgresql://postgres:postgrespassword@localhost:5432/linkedin_user_search` |
| `ELASTICSEARCH_NODE` | Elasticsearch node URL             | `http://localhost:9200`                                                      |
| `CSV_FILE_PATH`      | CSV file used by the seed script   | `../300 user linkedin.csv`                                                   |
| `CLIENT_ORIGIN`      | Allowed CORS origin for the client | `http://localhost:5173`                                                      |

## API Overview

| Method | Endpoint            | Description           |
| ------ | ------------------- | --------------------- |
| `GET`  | `/api/health`       | Health check          |
| `GET`  | `/api/users/search` | Search LinkedIn users |

## Useful Scripts

| Project | Script           | Description                   |
| ------- | ---------------- | ----------------------------- |
| server  | `pnpm start:dev` | Start NestJS in watch mode    |
| server  | `pnpm seed`      | Ingest CSV into Postgres + ES |
| server  | `pnpm build`     | Build the server              |
| client  | `pnpm dev`       | Start the dev server          |
| client  | `pnpm build`     | Build for production          |
| client  | `pnpm typecheck` | Generate types & run `tsc`    |

## License

MIT
