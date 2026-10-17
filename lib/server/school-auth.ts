import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function getBearerUser(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) return null;
  const token = match[1].trim();
  if (!token || token.length > 8192) return null;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return { user: data.user, token };
}

export async function getActiveMembership(schoolId: string, userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("school_memberships")
    .select("school_id, user_id, role, status")
    .eq("school_id", schoolId).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}
