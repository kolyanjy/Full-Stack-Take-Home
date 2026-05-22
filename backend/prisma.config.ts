import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    seed: "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
