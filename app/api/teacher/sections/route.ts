import { getCurrentAcademicYear } from "@/lib/academic-year";
import { readBodyLimited } from "@/lib/server/body-limit";
import { getActiveMembership, getBearerUser } from "@/lib/server/school-auth";
import { jsonError } from "@/lib/server/security";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getRequestSchool } from "@/lib/server/tenant";
import { getRequestId } from "@/lib/server/request-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateHeaders(requestId: string) {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
    "X-Content-Type-Options": "nosniff",
    "X-Request-ID": requestId,
  };
}

function validMutationOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin && request.headers.get("sec-fetch-site") !== "cross-site";
}

async function activeSchoolContext(request: Request) {
  const auth = await getBearerUser(request);
  if (!auth) return { response: jsonError("Sign in to manage class sections.", 401) } as const;
  const school = await getRequestSchool(request);
  if (!school) return { response: jsonError("This school link is not available.", 404) } as const;
  const membership = await getActiveMembership(school.id, auth.user.id);
  if (!membership || membership.status !== "active" || !["owner", "admin", "teacher"].includes(membership.role)) {
    return { response: jsonError("You need approved access to this school before managing class sections.", 403) } as const;
  }
  return { auth, school, membership } as const;
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const context = await activeSchoolContext(request);
    if ("response" in context) return context.response;
    const admin = getSupabaseAdmin();
    let query = admin.from("teacher_sections")
      .select("id, teacher_id, school_id, grade_level, section_name, academic_year, is_active")
      .eq("school_id", context.school.id);
    if (context.membership.role === "teacher") query = query.eq("teacher_id", context.auth.user.id);
    const { data: rows, error } = await query.order("grade_level").order("section_name");
    if (error) throw error;

    const teacherIds = [...new Set((rows ?? []).map((row) => row.teacher_id).filter(Boolean))];
    const { data: profiles, error: profilesError } = teacherIds.length
      ? await admin.from("teacher_profiles").select("id, full_name").in("id", teacherIds)
      : { data: [], error: null };
    if (profilesError) throw profilesError;
    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
    const sections = (rows ?? []).map((row) => ({
      ...row,
      adviserName: names.get(row.teacher_id)?.trim() || "Class adviser not listed",
    }));
    return Response.json({ sections }, { headers: privateHeaders(requestId) });
  } catch (error) {
    console.error("[api/teacher/sections] list failed", {
      requestId,
      code: error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : undefined,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    const missingSchema = ["42P01", "42703", "PGRST204", "PGRST205"].includes(String((error as { code?: unknown } | null)?.code ?? ""));
    return jsonError(missingSchema
      ? "Class-section storage is missing a required GuroVia database migration. Apply the current Supabase schema and migrations, then retry."
      : "Class sections could not be loaded. Check school membership and database configuration.", 503);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  try {
    if (!validMutationOrigin(request)) return jsonError("Class-section changes must come from the GuroVia website.", 403);
    const context = await activeSchoolContext(request);
    if ("response" in context) return context.response;

    const bounded = await readBodyLimited(request, 8 * 1024);
    if (!bounded) return jsonError("The class-section request is too large.", 413);
    let body: unknown;
    try { body = JSON.parse(new TextDecoder().decode(bounded)); }
    catch { return jsonError("Submit valid section details.", 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return jsonError("Submit valid section details.", 400);
    const input = body as Record<string, unknown>;
    const gradeLevel = Number(input.gradeLevel);
    const sectionName = typeof input.sectionName === "string" ? input.sectionName.trim().replace(/\s+/g, " ") : "";
    if (!Number.isInteger(gradeLevel) || gradeLevel < 7 || gradeLevel > 12) return jsonError("Choose a valid grade level from Grade 7 to Grade 12.", 400);
    if (sectionName.length < 1 || sectionName.length > 40) return jsonError("Section name must be between 1 and 40 characters.", 400);

    const admin = getSupabaseAdmin();
    const { data: section, error } = await admin.from("teacher_sections").insert({
      school_id: context.school.id,
      teacher_id: context.auth.user.id,
      grade_level: gradeLevel,
      section_name: sectionName,
      academic_year: getCurrentAcademicYear(),
      is_active: true,
    }).select("id, teacher_id, school_id, grade_level, section_name, academic_year, is_active").single();
    if (error) {
      if (error.code === "23505") return jsonError("That section is already listed for this school year.", 409);
      throw error;
    }
    return Response.json({ section: { ...section, adviserName: context.auth.user.user_metadata?.full_name || context.auth.user.email || "Class adviser not listed" } }, {
      status: 201,
      headers: privateHeaders(requestId),
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
    console.error("[api/teacher/sections] create failed", { requestId, code, name: error instanceof Error ? error.name : "UnknownError" });
    const missingSchema = ["42P01", "42703", "PGRST204", "PGRST205"].includes(code);
    return jsonError((missingSchema
      ? "Class-section storage is missing a required GuroVia database migration. Apply the current Supabase schema and migrations, then retry."
      : "The section could not be created. Check the server log using reference ID: " + requestId), 503);
  }
}
