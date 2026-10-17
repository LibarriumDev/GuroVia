import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSchoolBySlug } from "@/lib/server/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const school = await getSchoolBySlug(slug);
    if (!school?.logo_path) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    const { data, error } = await getSupabaseAdmin().storage.from("school-logos").download(school.logo_path);
    if (error || !data || data.size <= 0 || data.size > 1024 * 1024) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    const bytes = Buffer.from(await data.arrayBuffer());
    if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    return new Response(bytes, { status: 200, headers: { "Content-Type": "image/webp", "Content-Length": String(bytes.length), "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin" } });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  }
}
