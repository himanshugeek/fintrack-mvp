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
  FIREBASE_WEB_API_KEY: z.string().min(1).default("AIzaSyD-rQeSVvLBhpN35FcUSj6X7jKZoz2tp_g"),
  LOG_DB_QUERIES: booleanFromEnv.default(false),
});

export const env = envSchema.parse(process.env);
