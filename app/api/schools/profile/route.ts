import { getRequestId } from "@/lib/server/request-id";
import { readBodyLimited } from "@/lib/server/body-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getActiveMembership, getBearerUser } from "@/lib/server/school-auth";
import { getRequestSchool } from "@/lib/server/tenant";
import { allowRequest, jsonError } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders = (requestId: string) => ({ "Cache-Control": "no-store, no-cache, must-revalidate, private", Pragma: "no-cache", "X-Request-ID": requestId });

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return jsonError("School profile updates must come from this website.", 403);
    if (request.headers.get("sec-fetch-site") === "cross-site") return jsonError("Cross-site school profile updates are not accepted.", 403);
    const auth = await getBearerUser(request);
    if (!auth) return jsonError("Sign in with the school owner or administrator account.", 401);
    const school = await getRequestSchool(request);
    if (!school) return jsonError("This school link is not available.", 404);
    const membership = await getActiveMembership(school.id, auth.user.id);
    if (!membership || membership.status !== "active" || !["owner", "admin"].includes(membership.role)) {
      return jsonError("Only an active school owner or administrator can update the official School ID.", 403);
    }
    if (!(await allowRequest(request, "school-profile-id-update", 5, 3600, auth.user.id))) {
      return jsonError("Too many School ID changes. Please try again later.", 429);
    }
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      return jsonError("Send the School ID as JSON.", 415);
    }
    const bytes = await readBodyLimited(request, 4096);
    if (!bytes) return jsonError("Request is too large.", 413);
    let parsed: unknown;
    try { parsed = JSON.parse(new TextDecoder().decode(bytes)); } catch { return jsonError("Enter a valid School ID.", 400); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return jsonError("Enter a valid School ID.", 400);
    const raw = (parsed as Record<string, unknown>).officialSchoolId;
    const officialSchoolId = typeof raw === "string" ? raw.trim().toUpperCase() : "";
    if (!/^[A-Z0-9][A-Z0-9-]{2,19}$/.test(officialSchoolId)) {
      return jsonError("Enter a valid official School ID (3–20 letters, numbers, or hyphens).", 400);
    }
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("schools")
      .update({ official_school_id: officialSchoolId, updated_at: new Date().toISOString() })
      .eq("id", school.id)
      .eq("status", "active");
    if (error) {
      if (error.code === "23505") return jsonError("That Official School ID is already assigned to another school.", 409);
      throw error;
    }
    return Response.json({ success: true, officialSchoolId }, { headers: privateHeaders(requestId) });
  } catch (error) {
    console.error("[api/schools/profile] official School ID update failed", {
      requestId,
      name: error instanceof Error ? error.name : "UnknownError",
      code: error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : undefined
    });
    return Response.json({ error: "The official School ID could not be updated. Share the reference ID with support.", requestId }, {
      status: 503,
      headers: privateHeaders(requestId)
    });
  }
}
