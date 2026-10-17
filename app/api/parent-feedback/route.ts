import { getRequestId } from "@/lib/server/request-id";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getActiveMembership, getBearerUser } from "@/lib/server/school-auth";
import { getRequestSchool } from "@/lib/server/tenant";
import { allowRequest, decryptSensitiveField } from "@/lib/server/security";
import { readBodyLimited } from "@/lib/server/body-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateResponse(body: unknown, status = 200, requestId?: string) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
      "Expires": "0",
      "X-Content-Type-Options": "nosniff",
      ...(requestId ? { "X-Request-ID": requestId } : {})
    }
  });
}

async function authorizeTeacher(request: Request) {
  const auth = await getBearerUser(request);
  if (!auth) return { ok: false as const, status: 401, message: "Sign in through the teacher portal to view parent feedback." };
  const school = await getRequestSchool(request);
  if (!school) return { ok: false as const, status: 404, message: "This school link is not available." };
  const membership = await getActiveMembership(school.id, auth.user.id);
  if (!membership || membership.status !== "active") {
    return { ok: false as const, status: 403, message: "You do not have active access to this school's feedback inbox." };
  }
  const admin = getSupabaseAdmin();
  return { ok: true as const, admin, user: auth.user, school, membership };
}

function relationValue<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function applyTeacherScope<T extends { eq: (column: string, value: string) => T }>(query: T, auth: Extract<Awaited<ReturnType<typeof authorizeTeacher>>, { ok: true }>) {
  const schoolQuery = query.eq("school_id", auth.school.id);
  return auth.membership.role === "teacher" ? schoolQuery.eq("teacher_id", auth.user.id) : schoolQuery;
}

/** School owners/admins can review school feedback; teachers only see feedback assigned to them. */
export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const auth = await authorizeTeacher(request);
    if (!auth.ok) return privateResponse({ error: auth.message }, auth.status, requestId);
    if (!(await allowRequest(request, "parent-feedback-inbox-read", 60, 900, `${auth.school.id}:${auth.user.id}`))) {
      return privateResponse({ error: "Too many inbox requests. Please try again shortly." }, 429, requestId);
    }

    if (new URL(request.url).searchParams.get("summary") === "1") {
      let countQuery = auth.admin.from("student_parent_feedback").select("id", { count: "exact", head: true })
        .eq("school_id", auth.school.id).eq("status", "new");
      if (auth.membership.role === "teacher") countQuery = countQuery.eq("teacher_id", auth.user.id);
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      return privateResponse({ unreadCount: count ?? 0 }, 200, requestId);
    }

    let messagesQuery = auth.admin.from("student_parent_feedback")
      .select("id, school_id, student_id, section_id, teacher_id, guardian_name_encrypted, message_encrypted, subject_name, status, privacy_notice_version, consented_at, created_at, updated_at, student:students(full_name), section:teacher_sections(grade_level, section_name, academic_year)")
      .eq("school_id", auth.school.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (auth.membership.role === "teacher") messagesQuery = messagesQuery.eq("teacher_id", auth.user.id);
    const { data, error } = await messagesQuery;
    if (error) throw error;
    const messages = (data ?? []).map((row) => ({
      id: row.id,
      studentName: relationValue(row.student as { full_name: string } | { full_name: string }[] | null)?.full_name ?? "Student record",
      section: relationValue(row.section as { grade_level: number; section_name: string; academic_year: string } | { grade_level: number; section_name: string; academic_year: string }[] | null),
      guardianName: decryptSensitiveField(row.guardian_name_encrypted),
      message: decryptSensitiveField(row.message_encrypted),
      subjectName: row.subject_name,
      status: row.status,
      privacyNoticeVersion: row.privacy_notice_version,
      consentedAt: row.consented_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    return privateResponse({ messages }, 200, requestId);
  } catch (error) {
    console.error("[api/parent-feedback] list failed", { requestId, name: error instanceof Error ? error.name : "UnknownError" });
    return privateResponse({ error: "The parent feedback inbox is temporarily unavailable.", requestId }, 503, requestId);
  }
}

export async function PATCH(request: Request) {
  const requestId = getRequestId(request);
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return privateResponse({ error: "Feedback updates must come from this website." }, 403, requestId);
    if (request.headers.get("sec-fetch-site") === "cross-site") return privateResponse({ error: "Cross-site feedback updates are not accepted." }, 403, requestId);
    const auth = await authorizeTeacher(request);
    if (!auth.ok) return privateResponse({ error: auth.message }, auth.status, requestId);
    if (!(await allowRequest(request, "parent-feedback-inbox-update", 40, 900, `${auth.school.id}:${auth.user.id}`))) {
      return privateResponse({ error: "Too many inbox updates. Please try again shortly." }, 429, requestId);
    }
    const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLocaleLowerCase("en");
    if (contentType !== "application/json") return privateResponse({ error: "Send a JSON status update." }, 415, requestId);
    const boundedBody = await readBodyLimited(request, 2048);
    if (!boundedBody) return privateResponse({ error: "The status update is too large." }, 413, requestId);
    let parsed: unknown;
    try { parsed = JSON.parse(new TextDecoder().decode(boundedBody)); } catch { return privateResponse({ error: "The status update could not be read." }, 400, requestId); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return privateResponse({ error: "The status update could not be read." }, 400, requestId);
    const body = parsed as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : "";
    const status = body.status;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return privateResponse({ error: "Choose a valid feedback item." }, 400, requestId);
    if (status !== "new" && status !== "in_review" && status !== "resolved") return privateResponse({ error: "Choose a valid feedback status." }, 400, requestId);
    let updateQuery = auth.admin.from("student_parent_feedback").update({ status, updated_at: new Date().toISOString() })
      .eq("id", id).eq("school_id", auth.school.id);
    if (auth.membership.role === "teacher") updateQuery = updateQuery.eq("teacher_id", auth.user.id);
    const { data, error } = await updateQuery.select("id, status").maybeSingle();
    if (error) throw error;
    if (!data) return privateResponse({ error: "That feedback was not found in your school's inbox." }, 404, requestId);
    return privateResponse({ id: data.id, status: data.status, message: "Feedback status updated." }, 200, requestId);
  } catch (error) {
    console.error("[api/parent-feedback] update failed", { requestId, name: error instanceof Error ? error.name : "UnknownError" });
    return privateResponse({ error: "The parent feedback inbox is temporarily unavailable.", requestId }, 503, requestId);
  }
}
