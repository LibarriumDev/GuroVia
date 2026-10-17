"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { fetchWithRequestId } from "@/lib/request-id";
import type { SchoolBranding } from "@/lib/school-types";
import { schoolPath } from "@/lib/school-path";
import { Brand } from "@/components/brand";

type Membership = { user_id: string; role: "owner" | "admin" | "teacher"; status: "pending" | "active" | "suspended"; created_at: string; teacher: { full_name: string; email: string } | null };
export function SchoolManager({ school }: { school: SchoolBranding }) {
  const supabase = getSupabaseBrowserClient();
  const [token, setToken] = useState("");
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
      const accessToken = data.session?.access_token || "";
      setToken(accessToken);
      if (!accessToken) { setMembers([]); setError("Sign in with the school owner or administrator account to manage staff access."); return; }
      const response = await fetchWithRequestId("/api/schools/members", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "School members could not be loaded.");
      setMembers(payload.memberships ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "School members could not be loaded.");
    } finally { setLoading(false); }
  }, [supabase]);
  useEffect(() => { void load(); }, [load]);

  async function updateMember(userId: string, status: "active" | "suspended") {
    if (!token) return;
    setBusyId(userId); setError(""); setNotice("");
    try {
      const response = await fetchWithRequestId("/api/schools/members", { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ userId, status }), cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Access could not be updated.");
      setNotice(status === "active" ? "Teacher access approved." : "Teacher access suspended.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Access could not be updated."); }
    finally { setBusyId(""); }
  }

  return <main className="school-manager-page"><div className="school-manager-shell">
    <header className="school-manager-header"><Brand school={school} /><Link className="button button-outline" href={schoolPath(school.slug, "/teacher")}>Back to teacher portal</Link></header>
    <section className="school-manager-heading"><span className="section-kicker">SCHOOL ADMINISTRATION</span><h1>Manage staff access</h1><p>{school.name}</p><p>Approve teachers before they can create or manage class records for this school.</p></section>
    {error && <p role="alert" className="form-alert error-alert">{error}</p>}{notice && <p role="status" className="form-alert success-alert">{notice}</p>}
    <section className="school-manager-list"><div className="school-manager-list-heading"><h2>School members</h2><button type="button" className="button button-outline" onClick={() => void load()} disabled={loading}>Refresh</button></div>
      {loading ? <p>Loading members…</p> : members.length === 0 ? <p>No staff access requests yet.</p> : members.map((member) => <article className="school-manager-member" key={member.user_id}><div><strong>{member.teacher?.full_name || "Teacher account"}</strong><span>{member.teacher?.email || "Email not available"}</span><small>{member.role} · {member.status}</small></div><div className="school-manager-member-actions">{member.role === "teacher" && member.status === "pending" && <button className="button button-primary" type="button" disabled={!!busyId} onClick={() => void updateMember(member.user_id, "active")}>{busyId === member.user_id ? "Updating…" : "Approve"}</button>}{member.role === "teacher" && member.status === "active" && <button className="button button-outline" type="button" disabled={!!busyId} onClick={() => void updateMember(member.user_id, "suspended")}>{busyId === member.user_id ? "Updating…" : "Suspend"}</button>}{member.role === "teacher" && member.status === "suspended" && <button className="button button-outline" type="button" disabled={!!busyId} onClick={() => void updateMember(member.user_id, "active")}>{busyId === member.user_id ? "Updating…" : "Restore access"}</button>}</div></article>)}
    </section>
    <p className="school-manager-help">Share only your school's link with staff and students. A school link identifies the tenant but does not grant access by itself.</p>
  </div></main>;
}
