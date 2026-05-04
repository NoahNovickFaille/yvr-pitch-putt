const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID_V4.test(value);
}

/** True when the signed-in user is a real Supabase auth user (RLS applies). */
export function isSupabaseAuthUserId(userId: string | null | undefined): boolean {
  return isUuid(userId);
}
