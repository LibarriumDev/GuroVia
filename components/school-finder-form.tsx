"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithRequestId } from "@/lib/request-id";

type FoundSchool = {
  name: string;
  shortName: string;
  officialSchoolId: string;
  slug: string;
  city: string | null;
  province: string | null;
  logoUrl: string | null;
  url: string;
};

export function SchoolFinderForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [school, setSchool] = useState<FoundSchool | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSchool(null);
    const normalized = schoolId.trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9][A-Z0-9-]{2,19}$/.test(normalized)) {
      setError("Enter the official School ID, such as 301734.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetchWithRequestId("/api/schools/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ officialSchoolId: normalized }),
        cache: "no-store"
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "School lookup failed.");
      const found = payload.school as FoundSchool | undefined;
      if (!found || typeof found.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(found.slug)) {
        throw new Error("The school result was invalid. Please try again.");
      }
      setSchool(found);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "School lookup failed. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <div className={`school-finder ${compact ? "school-finder-compact" : "school-finder-page-form"}`}>
      <form method="post" onSubmit={submit} className="school-finder-form">
        <label htmlFor={compact ? "school-id-home" : "school-id-page"}>Official School ID</label>
        <div className="school-finder-input-row">
          <input
            id={compact ? "school-id-home" : "school-id-page"}
            value={schoolId}
            onChange={(event) => setSchoolId(event.target.value.toUpperCase().replace(/\s+/g, ""))}
            placeholder="e.g. 301734"
            autoComplete="off"
            maxLength={20}
            minLength={3}
            pattern="[A-Za-z0-9](?:[A-Za-z0-9]|-){2,19}"
            aria-describedby={error ? (compact ? "school-finder-error-home" : "school-finder-error-page") : (compact ? "school-finder-help-home" : "school-finder-help-page")}
            required
          />
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Searching…" : "Find school"}</button>
        </div>
        <small id={compact ? "school-finder-help-home" : "school-finder-help-page"}>Searches for an exact ID. Schools are not shown in a public directory.</small>
        {error && <p id={compact ? "school-finder-error-home" : "school-finder-error-page"} className="form-alert error-alert" role="alert">{error}</p>}
      </form>
      {school && <article className="school-finder-result" aria-live="polite">
        <div className="school-finder-result-brand">
          <span className="school-finder-result-logo">{school.logoUrl ? <img src={school.logoUrl} alt="" /> : <span>{school.shortName.slice(0, 2).toUpperCase()}</span>}</span>
          <div><span className="section-kicker">SCHOOL FOUND</span><h3>{school.name}</h3><p>Official School ID: <strong>{school.officialSchoolId}</strong>{[school.city, school.province].filter(Boolean).length ? ` · ${[school.city, school.province].filter(Boolean).join(", ")}` : ""}</p></div>
        </div>
        <button type="button" className="button button-primary school-finder-open" onClick={() => router.push(school.url)}>Open school portal <span aria-hidden="true">→</span></button>
      </article>}
      {!compact && <p className="school-finder-secondary">Don't know your school's ID? <Link href="/contact">Contact GuroVia support</Link> or ask your school administrator.</p>}
    </div>
  );
}
