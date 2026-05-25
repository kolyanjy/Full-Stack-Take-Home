# 🌍 Highwood Engineering Challenge: Emissions Data Platform

## Local Setup
1. Copy the backend environment file:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Start the app and infrastructure:
   ```bash
   docker compose up -d
   ```
3. Seed the database after the backend container is running:
   ```bash
   docker exec -it <backend-container-id> npx prisma db seed
   ```

> Frontend: `http://localhost:3000`

## **The Context**
Highwood Emissions Management is on a mission to provide industrial emissions transparency. Our platform processes vast streams of methane data from sensors, satellites, and field engineers. In our world, **data integrity is non-negotiable**. A lost packet or a double-counted emission can lead to inaccurate regulatory reporting (OGMP 2.0) and multi-million dollar implications for our clients.

## **The Challenge**
Your goal is to build the core of an **Emissions Ingestion & Analytics Engine**. This system must be resilient to unstable network conditions, handle high-concurrency updates, and be architected in a way that allows other engineers to build upon it easily.

---

## **🛠 Technology Stack**
We value the right tool for the job. While we have preferences, we are interested in how you wield your chosen stack.
* **Backend:** Node.js preferred (NestJS is our standard), but other modern runtimes are acceptable.
* **Frontend:** React preferred (Next.js App Router is our standard), but other frameworks like Vue or Svelte are also fine.
* **Database:** **PostgreSQL is required**.
* **Cache:** **Redis is optional** (provided in the docker-compose).
* **Tools:** Any ORM (Drizzle/Prisma) and Validation libraries (Zod) are encouraged.

---

## **🚀 Core Functional Requirements**

### **1. [POST] /sites — Asset Management**
Create an industrial site (e.g., a well pad) that requires monitoring.
* Each site must have an `emission_limit` and metadata.
* **Platform Goal:** Implement a unified error-handling and response structure that could serve as a standard for a multi-team environment.

### **2. [POST] /ingest — Reliable Batch Ingestion**
Accept a batch of methane readings (up to 100 entries) for a specific site.
* **Atomic Transactions:** In a single transaction, the system must:
    1. Persist the raw measurements.
    2. Atomically update the site’s `total_emissions_to_date` summary.
* **Network Resilience:** Field devices often operate in low-connectivity areas. If a client retries a request due to a timeout, the system **must not** create duplicate records or double-count the emissions in the summary.

### **3. [GET] /sites/:id/metrics — Analytics**
Retrieve a summary of a site’s performance, including its current compliance status (e.g., "Within Limit" vs. "Limit Exceeded").

### **4. [Frontend] Monitoring Dashboard**
Build a dashboard that allows an admin to:
* View all sites and their real-time emission totals.
* Use a "Manual Ingestion" form to simulate sensor data.
* **UX Resilience:** Handle API errors gracefully. Implement a "Retry" mechanism that demonstrates how the frontend and backend collaborate to prevent data duplication.

---

## **🌟 Choose Your Strength (Bonus Tasks)**
> 🚨 **Note for Senior/Lead Applicants:** Implementation of **at least 2 items** from this list is **mandatory**. For Intermediate roles, these are optional but highly encouraged.

1.  **Concurrency Control:** How does the system handle 10 concurrent sources updating the same `site_id`? Implement a protection strategy (e.g., Optimistic or Pessimistic locking).
2.  **Architecture Pattern:** Demonstrate a scalable approach, such as **Command/Processor patterns (OOP)** or an **Event-Driven** model.
3.  **Database Scalability:** Describe or implement a **Partitioning** strategy for the measurements table (e.g., by month/year) to handle 100M+ rows.
4.  **Transactional Outbox:** Implement the **Outbox Pattern** to ensure that once a measurement is saved, a downstream "Alerting Service" is guaranteed to be notified.
5.  **Developer Experience (DX):** Provide a seamless setup. Ensure the project can be started with a single command (e.g., `docker-compose`) including migrations and initial seed data.
6.  **Observability:** Implement basic logging or metrics that track how many requests were identified and rejected as duplicates.
7.  **Type-Safe Contract:** Share schemas (e.g., Zod) between the backend and frontend to ensure end-to-end type safety.
8.  **API Versioning:** Implement a versioning strategy that ensures backward compatibility for older IoT sensors.

---

## **🔧 Local Development & Infrastructure**
We provide a basic `docker-compose.yml` to reduce setup friction. You are free to modify, replace, or remove components as you see fit.

### **Quick Start**
1.  Initialize environment: `cp .env.example .env`
2.  Start infrastructure: `docker compose up -d`
3.  (Optional) DB Admin UI: `docker compose --profile tools up -d` (available at port 5050).

---

## **📦 What We Are Looking For**
* **Engineering Maturity:** How you handle "The Hard Parts"—concurrency, atomicity, and failures.
* **Platform Thinking:** Is your code modular? Is it easy for another developer to understand your abstractions?
* **Data Integrity:** Does your solution truly prevent double-counting under stress?
* **Documentation:** Please include an `ARCHITECTURE.md` file explaining your key technical decisions and trade-offs.

---

### **Submission**
* Provide a link to a **public GitHub repository**.
* **Deployment (Bonus):** We highly encourage providing a live URL (Vercel, Railway, AWS, etc.).
* **Setup Guide:** Ensure your README has clear instructions on how to run the app, migrations, and tests locally.

**Good luck! We are excited to see how you approach these challenges.**
