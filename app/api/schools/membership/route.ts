import { getRequestId } from "@/lib/server/request-id";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getActiveMembership, getBearerUser } from "@/lib/server/school-auth";
import { getRequestSchool } from "@/lib/server/tenant";
import { jsonError } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function privateHeaders(requestId: string) { return { "Cache-Control": "no-store, no-cache, must-revalidate, private", "Pragma": "no-cache", "X-Request-ID": requestId }; }

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const auth = await getBearerUser(request);
    if (!auth) return jsonError("Sign in to check school access.", 401);
    const school = await getRequestSchool(request);
    if (!school) return jsonError("This school link is not available.", 404);
    const membership = await getActiveMembership(school.id, auth.user.id);
    return Response.json({ school: { id: school.id, name: school.name, slug: school.slug }, membership }, { headers: privateHeaders(requestId) });
  } catch (error) {
    console.error("[api/schools/membership] lookup failed", { requestId, name: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("School access could not be checked.", 503);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return jsonError("Access requests must come from this website.", 403);
    const auth = await getBearerUser(request);
    if (!auth) return jsonError("Sign in before requesting school access.", 401);
    const school = await getRequestSchool(request);
    if (!school) return jsonError("This school link is not available.", 404);
    const existing = await getActiveMembership(school.id, auth.user.id);
    if (existing?.status === "active") return Response.json({ message: "You already have access to this school.", membership: existing }, { headers: privateHeaders(requestId) });
    if (existing?.status === "suspended") return jsonError("Your access to this school is suspended. Contact the school administrator.", 403);
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("school_memberships").upsert({ school_id: school.id, user_id: auth.user.id, role: "teacher", status: "pending", updated_at: new Date().toISOString() }, { onConflict: "school_id,user_id" });
    if (error) throw error;
    return Response.json({ message: "Your request was sent to the school administrator for approval." }, { status: 201, headers: privateHeaders(requestId) });
  } catch (error) {
    console.error("[api/schools/membership] request failed", { requestId, name: error instanceof Error ? error.name : "UnknownError" });
    return jsonError("Your access request could not be submitted.", 503);
  }
}
