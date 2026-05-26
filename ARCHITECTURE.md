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
1. On the first request the `INSERT` succeeds → batch is recorded, readings are published to Kafka.
2. On any retry the `SELECT` finds the existing batch and returns the cached response **without re-publishing**.
3. Even under race conditions where two requests with the same `request_id` arrive simultaneously, the database PK constraint is the last line of defense — only one will commit.

**Trade-off:** Clients are responsible for generating and persisting the UUID before sending. This is standard practice for IoT devices (stored in flash/EEPROM).

---

## 3. Async Ingestion via Kafka Event Bus

**Decision:** The `POST /ingest` endpoint records the batch for idempotency and immediately publishes each reading as a separate Kafka message. Processing (measurement persistence, site total update, WebSocket emission) happens asynchronously in the Kafka consumer.

**Request flow:**
```
POST /ingest
  → IngestBatchProcessor   (idempotency check + create IngestBatch row)
  → EventBusProducerService (publish N messages to emissions.readings, one per reading)
  → HTTP 200 returned

Kafka consumer (same process, separate transport)
  → EventBusController     (routes topic → service)
  → ReadingsService        (create Measurement + increment site total + emit WebSocket)
```

**Why:**
- The HTTP handler returns in milliseconds regardless of batch size — the sensor is not blocked waiting for DB writes.
- Each reading is an independent unit of work. Failures are retried individually without re-processing the whole batch.
- Kafka provides durable at-least-once delivery, replacing the need for a polling outbox pattern.

**Trade-off:** There is a short lag (milliseconds to low seconds) between the HTTP 200 response and the WebSocket update reaching the frontend. This is acceptable for a near-real-time dashboard.

---

## 4. Concurrency Control — Atomic SQL Increment + Partition Key

**Decision:** `total_emissions_to_date` is incremented with an atomic SQL `UPDATE SET col = col + X` inside a transaction in the Kafka consumer. Each reading for the same site is routed to the same Kafka partition via `site_id` as the message key.

```typescript
// Producer: all readings for a site go to the same partition
this.client.emit('emissions.readings', { key: payload.site_id, value: payload });

// Consumer: atomic increment — no read-modify-write race
tx.site.update({ data: { total_emissions_to_date: { increment: reading.value } } });
```

**Why the partition key matters:** With multiple consumer instances each partition is owned by exactly one consumer. Keying by `site_id` means readings for the same site are always processed sequentially by the same instance, eliminating concurrent writes to the same row and avoiding DB lock contention entirely.

**Why atomic increment is safe without locking:** PostgreSQL serializes concurrent `UPDATE` statements on the same row at the storage level. Unlike a read-modify-write (`SELECT total, UPDATE total = $read + $new`), the `increment` form never reads a stale value into application memory.

**Trade-off:** Throughput per site is bounded by the speed of one consumer instance processing one partition. For a single well pad this is more than sufficient. At higher scale, increase the topic's partition count and consumer group size.

---

## 5. Event Bus Module — Topic-per-Service Routing

**Decision:** All Kafka producer/consumer logic lives in `src/event-bus/`. The `EventBusController` acts as a topic router — each `@EventPattern` maps to a dedicated service that owns that topic's processing logic.

```
src/event-bus/
├── event-bus.module.ts          # registers Kafka client, wires controller + services
├── event-bus.controller.ts      # @EventPattern routes → delegates to topic services
├── event-bus-producer.service.ts
├── reading-message.interface.ts
└── readings/
    └── readings.service.ts      # owns emissions.readings processing
```

**Why:** Keeps Kafka routing separate from business logic. Adding a new topic means adding a service under `event-bus/<topic>/` and a single `@EventPattern` line in the controller — no changes to existing services.

---

## 6. Kafka Consumer Retry

**Decision:** KafkaJS is configured with exponential backoff (5 retries, 300 ms initial delay, 2× factor). The consumer re-throws on failure so KafkaJS sees the error and retries the message from the same offset.

```
Attempt 1: 300ms → Attempt 2: 600ms → Attempt 3: 1.2s → Attempt 4: 2.4s → Attempt 5: 4.8s → crash
```

**Why re-throw instead of swallow:** Swallowing the error commits the offset, permanently losing the message. Re-throwing lets KafkaJS retry and, after exhaustion, crash the process — which ECS/Fargate automatically restarts, avoiding a silent data gap.

**Trade-off:** A persistent poison-pill message (e.g. a reading referencing a deleted site) will crash the consumer after 5 attempts. A dead-letter topic (`emissions.readings.dlt`) is the natural next step to park unprocessable messages without blocking the partition.

---

## 7. Infrastructure — AWS MSK for Kafka

**Decision:** Amazon MSK (Managed Streaming for Kafka) runs the Kafka cluster on AWS. A single MSK security group accepts port 9092 only from the backend ECS security group. The bootstrap broker string is stored in AWS Secrets Manager and injected into the ECS task at runtime.

**Why MSK over self-managed Kafka:** MSK handles broker provisioning, OS patching, storage scaling, and CloudWatch metrics. For a production emissions platform this removes operational overhead that is not core to the product.

**Configuration:**
- Kafka 3.6.0, 2 brokers across 2 private subnets (MSK minimum requirement)
- `kafka.t3.small` per broker, 20 GB EBS
- PLAINTEXT within the VPC (no TLS overhead for private traffic)
- `auto.create.topics.enable=true` — topics are created on first produce

---

## 8. Database Scalability — Partitioning Strategy

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

**Current state:** The table uses standard indexes on `(site_id)` and `(site_id, timestamp)` which are sufficient for the expected volume in a take-home context.

---

## 9. Type-Safe Contract — Shared Zod Schemas

**Decision:** All request/response shapes are defined as Zod schemas in `shared/schemas/`. Both the NestJS backend (`ZodValidationPipe`) and the Next.js frontend consume the same schemas.

**Why:** Eliminates the "frontend and backend disagree on the shape" class of bugs. A single schema change propagates to both validation (backend) and form/fetch handling (frontend).

---

## 10. API Versioning

**Decision:** URI versioning with NestJS's built-in `VersioningType.URI`. All routes are prefixed with `/v1/`.

**Why for IoT sensors:** Older field devices that are hard to update still hit `/v1/` explicitly. Future breaking changes ship as `/v2/` while `/v1/` remains active. URI versioning is the simplest for firmware developers to implement — no custom headers required.

---

## Key Trade-offs Summary

| Decision | Chose | Rejected | Reason |
|---|---|---|---|
| Idempotency store | DB primary key | Redis key-value | No additional infra; transactional safety |
| Ingest processing | Async via Kafka | Synchronous in request | Sensor not blocked; independent retry per reading |
| Concurrency | Partition key + atomic increment | Pessimistic locking | No DB locks needed; ordering guaranteed by Kafka |
| Event delivery | Kafka at-least-once | Transactional outbox (polling) | Lower latency; no 5-second polling delay |
| Consumer failure | Retry + re-throw | Swallow error | Prevents silent data loss; ECS restarts on exhaustion |
| Managed Kafka | AWS MSK | Self-hosted | No broker ops; integrates with VPC security groups |
| Validation | Zod | class-validator | Sharable with frontend; better DX |
| Versioning | URI `/v1/` | Header versioning | Easiest for IoT firmware |
