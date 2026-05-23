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
  GOOGLE_CLIENT_ID: z.string().min(1).default("google-client-id-placeholder.apps.googleusercontent.com"),
  GOOGLE_CLIENT_SECRET: z.string().min(1).default("google-client-secret-placeholder"),
  NEXTAUTH_SECRET: z.string().min(1).default("nextauth-secret-placeholder"),
  LOG_DB_QUERIES: booleanFromEnv.default(false),
});

export const env = envSchema.parse(process.env);
