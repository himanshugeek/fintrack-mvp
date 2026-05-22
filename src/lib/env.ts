import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default("postgres://postgres:postgres@127.0.0.1:5432/postgres"),
  NEXT_PUBLIC_SUPABASE_URL: z.url().default("https://example.supabase.co"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).default("public-anon-key"),
  CLERK_SECRET_KEY: z.string().min(1).default("test-secret"),
});

export const env = envSchema.parse(process.env);
