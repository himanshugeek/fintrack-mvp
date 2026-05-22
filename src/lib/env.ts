import { z } from "zod";

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}, z.boolean());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default("postgres://postgres:postgres@127.0.0.1:5432/postgres"),
  CLERK_SECRET_KEY: z.string().min(1).default("test-secret"),
  LOG_DB_QUERIES: booleanFromEnv.default(false),
});

export const env = envSchema.parse(process.env);
