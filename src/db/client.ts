import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

const shouldLogDbQueries = env.LOG_DB_QUERIES;

const client = postgres(env.DATABASE_URL, {
  prepare: false,
  debug: shouldLogDbQueries
    ? (_connection, query, parameters) => {
        console.info("[db:query]", { query, parameters });
      }
    : undefined,
  onnotice: shouldLogDbQueries
    ? (notice) => {
        console.info("[db:notice]", notice.message);
      }
    : undefined,
});

export const db = drizzle(client);
