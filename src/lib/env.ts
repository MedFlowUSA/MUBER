import { z } from "zod";
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional().or(z.literal("")),
});
const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional().or(z.literal("")),
});
export function readPublicEnv(
  env: Record<string, string | undefined> = process.env,
) {
  return publicSchema.parse(env);
}
export function readServerEnv(
  env: Record<string, string | undefined> = process.env,
) {
  return serverSchema.parse(env);
}
export function hasSupabaseConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const v = readPublicEnv(env);
  return Boolean(v.NEXT_PUBLIC_SUPABASE_URL && v.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
