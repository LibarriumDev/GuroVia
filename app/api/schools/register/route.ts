import { randomUUID } from "node:crypto";
import { readBodyLimited, requestWithBufferedBody } from "@/lib/server/body-limit";
import { getRequestId } from "@/lib/server/request-id";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getBearerUser } from "@/lib/server/school-auth";
import { allowRequest, jsonError } from "@/lib/server/security";
import { COOKIE_NOTICE_VERSION, PLATFORM_TERMS_VERSION, PRIVACY_NOTICE_VERSION, USER_AGREEMENT_VERSION } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_LOGO_BYTES = 1024 * 1024;
const RESERVED_SLUGS = new Set(["api", "s", "schools", "student", "teacher", "contact", "privacy", "terms", "auth", "_next", "favicon"]);
function clean(value: FormDataEntryValue | null, max: number) { return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : ""; }
function slugify(value: string) { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60); }

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  let logoPath = "";
  let createdSchoolId = "";
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return jsonError("School registration must be submitted from this website.", 403);
    if (request.headers.get("sec-fetch-site") === "cross-site") return jsonError("Cross-site registration is not accepted.", 403);
    const auth = await getBearerUser(request);
    if (!auth) return jsonError("Sign in with your verified teacher account before registering a school.", 401);
    if (!auth.user.email_confirmed_at) return jsonError("Confirm your teacher account email before registering a school.", 403);
    if (!(await allowRequest(request, "school-register-ip", 3, 3600))) return jsonError("Too many school registration attempts. Try again later.", 429);
    if (!(await allowRequest(request, "school-register-user", 2, 86400, auth.user.id))) return jsonError("This account has reached the school registration limit.", 429);
    const bounded = await readBodyLimited(request, 1300 * 1024);
    if (!bounded) return jsonError("The registration form is too large. Keep the WebP logo under 1 MB.", 413);
    const form = await requestWithBufferedBody(request, bounded).formData();
    // Require current policy-version acknowledgements; analytics opt-in is managed separately.
    if (form.get("legalAcceptance") !== "accepted"
      || form.get("platformTermsVersion") !== PLATFORM_TERMS_VERSION
      || form.get("userAgreementVersion") !== USER_AGREEMENT_VERSION
      || form.get("privacyNoticeVersion") !== PRIVACY_NOTICE_VERSION
      || form.get("cookieNoticeVersion") !== COOKIE_NOTICE_VERSION) {
      return jsonError("Review and acknowledge the current GuroVia Terms, Agreement of Use, Privacy Policy, and Cookie Policy before registering the school.", 400);
    }
    const legalAcceptedAt = new Date().toISOString();
    const name = clean(form.get("name"), 160);
    const shortName = clean(form.get("shortName"), 48);
    const slug = slugify(clean(form.get("slug"), 60));
    const email = clean(form.get("contactEmail"), 254).toLowerCase();
    const phone = clean(form.get("phone"), 32) || null;
    const address = clean(form.get("address"), 240) || null;
    const city = clean(form.get("city"), 100) || null;
    const province = clean(form.get("province"), 100) || null;
    const website = clean(form.get("website"), 240) || null;
    const logo = form.get("logo");
    if (name.length < 3 || shortName.length < 2) return jsonError("Enter a school name and short name.", 400);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || RESERVED_SLUGS.has(slug)) return jsonError("Choose a valid school link name that is not reserved by the platform.", 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Enter a valid school contact email.", 400);
    if (website && !/^https:\/\//i.test(website)) return jsonError("Website URLs must start with https://.", 400);
    if (!(logo instanceof File) || logo.size < 1 || logo.size > MAX_LOGO_BYTES || logo.type !== "image/webp") return jsonError("Upload a WebP school logo under 1 MB.", 400);
    const bytes = Buffer.from(await logo.arrayBuffer());
    if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") return jsonError("The logo must be a valid WebP image.", 400);

    const admin = getSupabaseAdmin();
    createdSchoolId = randomUUID();
    const { error: schoolError } = await admin.from("schools").insert({
      id: createdSchoolId, name, short_name: shortName, slug, contact_email: email,
      phone, address, city, province, website, created_by: auth.user.id, status: "active",
      platform_terms_version: PLATFORM_TERMS_VERSION,
      platform_terms_accepted_at: legalAcceptedAt,
      user_agreement_version: USER_AGREEMENT_VERSION,
      user_agreement_accepted_at: legalAcceptedAt,
      privacy_notice_version: PRIVACY_NOTICE_VERSION,
      privacy_notice_acknowledged_at: legalAcceptedAt,
      cookie_notice_version: COOKIE_NOTICE_VERSION,
      cookie_notice_acknowledged_at: legalAcceptedAt,
      legal_accepted_by: auth.user.id
    });
    if (schoolError) {
      if (schoolError.code === "23505") return jsonError("That personalized school link is already taken. Choose another name.", 409);
      throw schoolError;
    }

    logoPath = `${createdSchoolId}/logo.webp`;
    const { error: uploadError } = await admin.storage.from("school-logos").upload(logoPath, bytes, {
      contentType: "image/webp", cacheControl: "3600", upsert: false
    });
    if (uploadError) throw uploadError;
    const { error: logoUpdateError } = await admin.from("schools").update({ logo_path: logoPath, updated_at: new Date().toISOString() }).eq("id", createdSchoolId);
    if (logoUpdateError) throw logoUpdateError;
    const { error: membershipError } = await admin.from("school_memberships").insert({ school_id: createdSchoolId, user_id: auth.user.id, role: "owner", status: "active" });
    if (membershipError) throw membershipError;

    return Response.json({ success: true, slug, url: `/s/${slug}`, teacherUrl: `/s/${slug}/teacher`, schoolName: name }, {
      status: 201, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private", "X-Request-ID": requestId }
    });
  } catch (error) {
    const admin = getSupabaseAdmin();
    if (logoPath) { try { await admin.storage.from("school-logos").remove([logoPath]); } catch {} }
    if (createdSchoolId) { try { await admin.from("schools").delete().eq("id", createdSchoolId); } catch {} }
    console.error("[api/schools/register] failed", { requestId, name: error instanceof Error ? error.name : "UnknownError", code: error && typeof error === "object" && "code" in error ? String((error as {code?: unknown}).code ?? "") : undefined });
    return jsonError("The school could not be registered. Try again later or share the reference ID with support.", 503);
  }
}
