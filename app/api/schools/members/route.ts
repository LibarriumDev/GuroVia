import { getRequestId } from "@/lib/server/request-id";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getActiveMembership, getBearerUser } from "@/lib/server/school-auth";
import { getRequestSchool } from "@/lib/server/tenant";
import { readBodyLimited } from "@/lib/server/body-limit";
import { jsonError } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = (requestId: string) => ({ "Cache-Control": "no-store, no-cache, must-revalidate, private", "Pragma": "no-cache", "X-Request-ID": requestId });
async function adminContext(request: Request) {
  const auth = await getBearerUser(request);
  if (!auth) return { error: jsonError("Sign in first.", 401) } as const;
  const school = await getRequestSchool(request);
  if (!school) return { error: jsonError("This school link is not available.", 404) } as const;
  const membership = await getActiveMembership(school.id, auth.user.id);
  if (!membership || membership.status !== "active" || !["owner", "admin"].includes(membership.role)) return { error: jsonError("Only a school owner or administrator can manage access.", 403) } as const;
  return { auth, school, membership } as const;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const context = await adminContext(request);
    if ("error" in context) return context.error;
    const admin = getSupabaseAdmin();
    const { data: memberships, error } = await admin.from("school_memberships")
      .select("school_id, user_id, role, status, created_at")
      .eq("school_id", context.school.id).order("created_at", { ascending: true });
    if (error) throw error;
    const ids = [...new Set((memberships ?? []).map((membership) => membership.user_id))];
    const { data: profiles, error: profileError } = ids.length
      ? await admin.from("teacher_profiles").select("id, full_name, email").in("id", ids)
      : { data: [], error: null };
    if (profileError) throw profileError;
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const result = (memberships ?? []).map((membership) => ({ ...membership, teacher: profileMap.get(membership.user_id) ?? null }));
    return Response.json({ school: { id: context.school.id, name: context.school.name, slug: context.school.slug }, memberships: result }, { headers: headers(requestId) });
  } catch (error) {
    console.error("[api/schools/members] list failed", { requestId, name: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("School members could not be loaded.", 503);
  }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return jsonError("School access changes must come from this website.", 403);
    const context = await adminContext(request);
    if ("error" in context) return context.error;
    const bounded = await readBodyLimited(request, 4096);
    if (!bounded) return jsonError("Request is too large.", 413);
    let parsed: unknown;
    try { parsed = JSON.parse(new TextDecoder().decode(bounded)); } catch { return jsonError("Invalid request body.", 400); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return jsonError("Invalid request body.", 400);
    const body = parsed as Record<string, unknown>;
    const userId = typeof body.userId === "string" ? body.userId : "";
    const status = body.status;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) || !["active", "suspended"].includes(String(status))) return jsonError("Choose a valid teacher and access status.", 400);
    const admin = getSupabaseAdmin();
    const { data: target, error: targetError } = await admin.from("school_memberships").select("role,status").eq("school_id", context.school.id).eq("user_id", userId).maybeSingle();
    if (targetError) throw targetError;
    if (!target) return jsonError("That user has no membership in this school.", 404);
    if (target.role === "owner" || target.role === "admin") return jsonError("Owner and administrator memberships cannot be changed here.", 403);
    const { error } = await admin.from("school_memberships").update({ status, updated_at: new Date().toISOString() }).eq("school_id", context.school.id).eq("user_id", userId);
    if (error) throw error;
    return Response.json({ success: true }, { headers: headers(requestId) });
  } catch (error) {
    console.error("[api/schools/members] update failed", { requestId, name: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("The membership could not be updated.", 503);
  }
}
