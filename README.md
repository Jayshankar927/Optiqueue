# OptiQueue: Distributed Cloud Media Optimization Pipeline

A scalable, event-driven media processing engine designed to decouple CPU-bound FFmpeg tasks from HTTP ingestion using distributed message queues, managed storage, and containerized runtimes.

---

## System Architecture

```text
+-----------------------------------------------------------------------------------------+
|                                    React Client (apps/web)                              |
+-----------------------------------------------------------------------------------------+
               |                                                   ^
        POST /upload                                        GET /status/:id
         (Multipart)                                           (Polling)
               v                                                   |
+------------------------------+                          +-------------------------------+
|      Ingest API (apps/api)   |                          |          PostgreSQL           |
|  - Express HTTP server       |                          |  - Job state & metadata       |
|  - Multer validation         |                          |  - Byte delta tracking        |
+------------------------------+                          +-------------------------------+
               |                                                   ^
           Enqueues                                            Updates status &
           Job Payload                                         records storage URL
               v                                                   |
+------------------------------+                          +-------------------------------+
|     Redis Queue (BullMQ)     |                          |   Cloud Storage (Supabase S3) |
|  - media-transcode-queue     |                          |  - Optimized media bucket     |
+------------------------------+                          +-------------------------------+
               |                                                   ^
            Pulls                                             Streams output
             Job                                              via PutObject
               v                                                   |
+-----------------------------------------------------------------------------------------+
|                                Background Worker (apps/worker)                          |
|  - BullMQ Consumer (Concurrency: 1)                                                     |
|  - FFmpeg Engine (libwebp / libx264)                                                    |
|  - Local scratch volume cleanup                                                         |
+-----------------------------------------------------------------------------------------+
```

---

## Architectural Decisions

### Asynchronous Decoupling

Video and image transcoding via FFmpeg is CPU-intensive. Executing transcoding pipelines synchronously inside Express routes can block the Node.js event loop and reduce the API's ability to handle incoming requests.

OptiQueue therefore defers transcoding jobs to Redis through BullMQ. The API can acknowledge the request immediately with a `202 Accepted` response while the background worker processes the media asynchronously.

### Controlled Concurrency

Free-tier and shared developer environments can become unstable under unconstrained concurrent encoding workloads.

Worker concurrency is therefore capped at `concurrency: 1`. This limits the number of simultaneous FFmpeg jobs and provides more predictable memory and CPU usage while reducing the risk of Out-Of-Memory (OOM) failures.

### Transient Fault Tolerance

Network interruptions during cloud object-storage uploads or temporary database failures can cause individual processing steps to fail.

OptiQueue uses exponential backoff retries, with up to three attempts, before marking a job as `FAILED`.

The retry delay follows the general pattern:

```text
delay = 2000ms × 2^attempt
```

This allows temporary infrastructure failures to recover without immediately failing the entire job.

### Local Disk Hygiene

Intermediate uploads and transcoded output files are stored temporarily on local scratch volumes during processing.

After a successful upload to object storage, these temporary files are removed using filesystem cleanup operations such as `fs.unlinkSync`. This prevents the worker's local disk from continuously accumulating media files.

---

## Tech Stack

| Layer                     | Technology                             | Purpose                                                        |
| :------------------------ | :------------------------------------- | :------------------------------------------------------------- |
| **Monorepo**              | npm workspaces                         | Type synchronization and unified package management            |
| **Ingestion API**         | Node.js, Express, TypeScript           | Upload validation and asynchronous job submission              |
| **Background Worker**     | BullMQ, FFmpeg, fluent-ffmpeg          | Queue consumption and media transcoding                        |
| **Client UI**             | React 18, Vite, Tailwind CSS           | Upload interface with live progress monitoring                 |
| **Distributed Queue**     | Redis, BullMQ                          | Job queuing and transcode progress tracking                    |
| **Database**              | PostgreSQL (Supabase Pooler)           | Job-state persistence and payload-size accounting              |
| **Object Storage**        | S3-Compatible Storage (Supabase)       | Transcoded asset persistence and public URLs                   |
| **Containerization & CI** | Docker, Docker Compose, GitHub Actions | Multi-stage image builds and automated type-checking pipelines |

---

## Repository Structure

```text
optiqueue/
├── .github/
│   └── workflows/
│       └── deploy.yml             # Automated typecheck & GHCR multi-stage image build
├── apps/
│   ├── api/                       # Express ingest service (BullMQ Producer)
│   ├── web/                       # React 18 frontend client (Vite + Tailwind)
│   └── worker/                    # Transcoding consumer (BullMQ Worker + FFmpeg)
├── docker/
│   ├── api.Dockerfile             # Multi-stage production container for API
│   └── worker.Dockerfile          # Alpine Linux container with runtime FFmpeg
├── packages/
│   └── shared/                    # Shared types, constants, and payload schemas
├── docker-compose.yml             # Local orchestration for Redis and PostgreSQL
├── package.json                   # Root workspace orchestrator
└── README.md
```

---

## Getting Started

### 1. Prerequisites

Make sure the following are installed:

* Docker & Docker Compose
* Node.js 20+
* System-level FFmpeg

On Ubuntu, Debian, or WSL2:

```bash
sudo apt install ffmpeg
```

---

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
PORT=5000
NODE_ENV=development

# Redis (Local Docker or Upstash TLS)
REDIS_URL=redis://localhost:6379

# PostgreSQL Connection String (Local Docker or Supabase Pooler)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/optiqueue_db

# Supabase S3-Compatible Object Storage
SUPABASE_S3_ENDPOINT=https://<PROJECT_REF>.storage.supabase.co/storage/v1/s3
SUPABASE_S3_REGION=us-east-1
SUPABASE_S3_ACCESS_KEY_ID=your_access_key_id
SUPABASE_S3_SECRET_ACCESS_KEY=your_secret_access_key
SUPABASE_STORAGE_BUCKET=optiqueue-media
SUPABASE_PUBLIC_URL_PREFIX=https://<PROJECT_REF>.supabase.co/storage/v1/object/public/optiqueue-media
```

> **Security:** Never commit `.env` files or real credentials to version control. Add `.env` to `.gitignore`.

---

### 3. Database Migration

Initialize the PostgreSQL database schema:

```sql
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY,
  original_name VARCHAR(255) NOT NULL,
  source_size BIGINT NOT NULL,
  optimized_size BIGINT,
  status VARCHAR(50) NOT NULL,
  storage_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4. Build and Run

Install workspace dependencies:

```bash
npm install
```

Build the shared package, background worker, and API:

```bash
npm run --workspace packages/shared build
npm run --workspace apps/worker build
npm run --workspace apps/api build
```

Start the local backing datastores using Docker Compose:

```bash
docker compose up -d redis postgres
```

Launch the services in three separate terminal sessions.

**Terminal 1 — Ingest API Server**

```bash
npm run --workspace apps/api dev
```

**Terminal 2 — Background Transcoding Worker**

```bash
npm run --workspace apps/worker dev
```

**Terminal 3 — React Frontend Client**

```bash
npm run --workspace apps/web dev
```

---

## Performance Benchmarks

The following figures represent the benchmark targets/measurements used for evaluating the architecture:

| Metric                     | Synchronous Ingest (Monolith)                        | OptiQueue (Decoupled Architecture)                                      |
| :------------------------- | :--------------------------------------------------- | :---------------------------------------------------------------------- |
| **HTTP Response Time**     | 2,500ms – 10,000ms+                                  | **< 45ms** with immediate `202 Accepted`                                |
| **Node.js Event Loop Lag** | Severe when FFmpeg saturates CPU resources           | **Minimal**, because transcoding is handled by a separate worker        |
| **Burst Traffic Handling** | Increased risk of socket drops and HTTP 504 timeouts | **Buffered safely** inside the Redis/BullMQ queue                       |
| **Storage Optimization**   | Original assets retained without optimization        | **60%–85% compression** depending on input format and encoding settings |

> **Note:** Compression ratio and processing performance depend heavily on the input media, FFmpeg codec settings, resolution, bitrate, CPU resources, and workload. Benchmark numbers should therefore be treated as environment-specific measurements rather than universal guarantees.

