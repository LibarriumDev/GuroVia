import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const DEFAULT_SCHOOL_SLUG = process.env.DEFAULT_SCHOOL_SLUG?.trim() || "salvacion-national-high-school";

export type SchoolTenant = {
  id: string;
  name: string;
  short_name: string;
  slug: string;
  contact_email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  website: string | null;
  logo_path: string | null;
  status: "active" | "suspended";
};

export type PublicSchool = Omit<SchoolTenant, "logo_path"> & { logoUrl: string | null };

export function isValidSchoolSlug(slug: string) {
  return slug.length >= 3 && slug.length <= 60 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function schoolPath(slug: string, path = "") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/s/${encodeURIComponent(slug)}${clean === "/" ? "" : clean}`;
}

export async function getSchoolBySlug(slug: string, includeSuspended = false): Promise<SchoolTenant | null> {
  if (!isValidSchoolSlug(slug)) return null;
  const admin = getSupabaseAdmin();
  let query = admin.from("schools")
    .select("id, name, short_name, slug, contact_email, phone, address, city, province, website, logo_path, status")
    .eq("slug", slug);
  if (!includeSuspended) query = query.eq("status", "active");
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as SchoolTenant | null;
}

export function toPublicSchool(school: SchoolTenant): PublicSchool {
  const { logo_path: logoPath, ...rest } = school;
  return { ...rest, logoUrl: logoPath ? `/api/schools/${encodeURIComponent(school.slug)}/logo` : null };
}

export async function getDefaultSchool(): Promise<SchoolTenant | null> {
  return getSchoolBySlug(DEFAULT_SCHOOL_SLUG);
}

export async function getRequestSchool(request: Request): Promise<SchoolTenant | null> {
  const url = new URL(request.url);
  const raw = url.searchParams.get("school_slug");
  const slug = raw === null || raw.trim() === "" ? DEFAULT_SCHOOL_SLUG : raw.trim().toLowerCase();
  return getSchoolBySlug(slug);
}


/** Public directory fields only: never expose school contact details or internal IDs. */
export type SchoolDirectoryItem = {
  name: string;
  short_name: string;
  slug: string;
  city: string | null;
  province: string | null;
  logoUrl: string | null;
};

export async function listActiveSchoolDirectory(): Promise<SchoolDirectoryItem[]> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.from("schools")
      .select("name, short_name, slug, city, province, logo_path")
      .eq("status", "active")
      .order("name", { ascending: true })
      .limit(200);
    if (error) throw error;
    return (data ?? []).map((school) => ({
      name: school.name,
      short_name: school.short_name,
      slug: school.slug,
      city: school.city,
      province: school.province,
      logoUrl: school.logo_path ? `/api/schools/${encodeURIComponent(school.slug)}/logo` : null
    }));
  } catch (error) {
    console.error("[school-directory] failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return [];
  }
}
