import { getRequestId } from "@/lib/server/request-id";
import { readBodyLimited } from "@/lib/server/body-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { allowRequest, jsonError } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateResponse(body: unknown, status = 200, requestId?: string) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      Expires: "0",
      "X-Content-Type-Options": "nosniff",
      "X-Request-ID": requestId ?? ""
    }
  });
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return jsonError("School lookup must be submitted from this website.", 403);
    if (request.headers.get("sec-fetch-site") === "cross-site") return jsonError("Cross-site school lookup is not accepted.", 403);
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
      return jsonError("Send the School ID as JSON.", 415);
    }
    const bodyBytes = await readBodyLimited(request, 4096);
    if (!bodyBytes) return jsonError("The lookup request is too large.", 413);
    let body: unknown;
    try { body = JSON.parse(new TextDecoder().decode(bodyBytes)); } catch { return jsonError("Enter a valid School ID.", 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return jsonError("Enter a valid School ID.", 400);
    const raw = (body as Record<string, unknown>).officialSchoolId;
    const officialSchoolId = typeof raw === "string" ? raw.trim().toUpperCase() : "";
    if (!/^[A-Z0-9][A-Z0-9-]{2,19}$/.test(officialSchoolId)) return jsonError("Enter a valid official School ID (3–20 letters, numbers, or hyphens).", 400);
    if (!(await allowRequest(request, "school-find-by-id", 30, 300))) {
      return privateResponse({ error: "Too many school lookups. Please wait a few minutes and try again." }, 429, requestId);
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("schools")
      .select("name, short_name, official_school_id, slug, city, province, logo_path")
      .eq("status", "active")
      .ilike("official_school_id", officialSchoolId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return privateResponse({ error: "We couldn't find an active school with that ID. Check the number with your school administrator." }, 404, requestId);

    return privateResponse({
      school: {
        name: data.name,
        shortName: data.short_name,
        officialSchoolId: data.official_school_id,
        slug: data.slug,
        city: data.city,
        province: data.province,
        logoUrl: data.logo_path ? `/api/schools/${encodeURIComponent(data.slug)}/logo` : null,
        url: `/s/${encodeURIComponent(data.slug)}`
      }
    }, 200, requestId);
  } catch (error) {
    console.error("[api/schools/find] lookup failed", {
      requestId,
      name: error instanceof Error ? error.name : "UnknownError",
      code: error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : undefined
    });
    return privateResponse({ error: "School lookup is temporarily unavailable. Try again later or share the reference ID with support.", requestId }, 503, requestId);
  }
}
