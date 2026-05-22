# Architecture Decision Record

## Overview

This document explains the key technical decisions made in building the Emissions Ingestion & Analytics Engine.

---

## 1. Unified API Response Contract

**Decision:** A global `TransformInterceptor` wraps every successful response, and an `AllExceptionsFilter` catches every error — both produce the same envelope:

```json
{ "success": true|false, "data": {...} | "error": {...}, "meta": { "timestamp", "version" } }
```

**Why:** Multi-team platforms suffer from inconsistent error formats that break client parsers. A single contract means every client (frontend, IoT sensor, third-party integration) has one parsing strategy regardless of which team wrote the endpoint.

---

## 2. Idempotency via Request ID as Primary Key

**Decision:** Clients submit a `request_id` (UUID v4) with every `POST /ingest`. This UUID becomes the **primary key** of the `ingest_batches` table.

**How it prevents double-counting:**
1. On the first request the `INSERT` succeeds → measurements are saved, site total incremented.
2. On any retry the `INSERT` would violate the unique PK constraint — but we check first with a fast `SELECT` and return the cached response **without re-processing**.
3. Even under race conditions where two requests with the same `request_id` arrive simultaneously, the database PK constraint is the last line of defense — only one will commit.

**Trade-off:** Clients are responsible for generating and persisting the UUID before sending. This is standard practice for IoT devices (stored in flash/EEPROM).

---

## 3. Concurrency Control — Pessimistic Locking

**Decision:** The `POST /ingest` transaction uses `SELECT ... FOR UPDATE` to lock the site row.

```sql
SELECT id FROM sites WHERE id = $1 FOR UPDATE
```

**Why:** With 10 concurrent requests updating `total_emissions_to_date` on the same site, an unprotected `UPDATE SET total = total + X` risks lost updates due to the read-modify-write race. Pessimistic locking serializes concurrent writers at the database level — simpler to reason about than optimistic locking retries for this write-heavy workload.

**Trade-off:** Throughput for a single site is limited to ~sequential processing. For a single well pad this is acceptable. A sharded write queue (one queue per site) would unlock parallelism at higher scale.

---

## 4. Architecture Pattern — Command / Processor

**Decision:** Ingestion uses the Command/Processor pattern:

```
IngestController → IngestService → IngestBatchCommand → IngestBatchProcessor
```

- `IngestBatchCommand` is a pure data object (no logic).
- `IngestBatchProcessor` encapsulates all transaction logic, locking, and outbox event creation.

**Why:** Separates transport concerns (HTTP) from domain logic. The processor can be invoked from a message queue consumer, a scheduled retry job, or a test harness without changing any business code.

---

## 5. Transactional Outbox Pattern

**Decision:** When measurements are ingested, an `OutboxEvent` row is written **in the same transaction**. A background `OutboxProcessor` (scheduled every 5 seconds) reads unprocessed events and dispatches them to the AlertingService.

**Why:** Without the Outbox, a crash between "measurement saved" and "alert sent" causes a silent notification miss. With the Outbox, the event is either committed alongside the data (both succeed) or rolled back (neither exists). At-least-once delivery is guaranteed.

**Current implementation:** The AlertingService is simulated via structured logging. In production, replace `dispatchEvent` with a Kafka producer, SNS publish, or HTTP webhook call.

---

## 6. Database Scalability — Partitioning Strategy

**Decision:** The `measurements` table is designed for PostgreSQL declarative range partitioning by `timestamp` (monthly partitions).

**Implementation steps for production:**

```sql
-- Replace the plain measurements table with a partitioned parent
CREATE TABLE measurements (
  -- columns...
  timestamp TIMESTAMPTZ NOT NULL
) PARTITION BY RANGE (timestamp);

-- Create child partitions per month
CREATE TABLE measurements_2026_05
  PARTITION OF measurements
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
```

**Why:** At 100M+ rows, a single table's B-tree index degrades. Monthly partitions allow:
- Partition pruning (queries scoped to a time range only scan relevant partitions)
- Fast archival (DROP PARTITION instead of DELETE)
- Parallel vacuuming per partition

**Current state:** The table uses standard indexes on `(site_id)` and `(site_id, timestamp)` which are sufficient for the expected volume in a take-home context. Prisma does not natively manage partitioned tables, so partition creation and management would use raw SQL migrations or a pg_partman extension.

---

## 7. Type-Safe Contract — Shared Zod Schemas

**Decision:** All request/response shapes are defined as Zod schemas in `shared/schemas/`. Both the NestJS backend (`ZodValidationPipe`) and the Next.js frontend consume the same schemas.

**Why:** Eliminates the "frontend and backend disagree on the shape" class of bugs. A single schema change propagates to both validation (backend) and form/fetch handling (frontend).

---

## 8. API Versioning

**Decision:** URI versioning with NestJS's built-in `VersioningType.URI`. All routes are prefixed with `/v1/`.

**Why for IoT sensors:** Older field devices that are hard to update still hit `/v1/` explicitly. Future breaking changes ship as `/v2/` while `/v1/` remains active. URI versioning is the simplest for firmware developers to implement — no custom headers required.

---

## Key Trade-offs Summary

| Decision | Chose | Rejected | Reason |
|---|---|---|---|
| Idempotency store | DB primary key | Redis key-value | No additional infra; transactional safety |
| Concurrency | Pessimistic lock | Optimistic lock + retry | Simpler for write-heavy, single-site workload |
| Event delivery | Outbox pattern | Fire-and-forget | Guarantees no missed alerts on crash |
| Validation | Zod | class-validator | Sharable with frontend; better DX |
| Versioning | URI `/v1/` | Header versioning | Easiest for IoT firmware |
