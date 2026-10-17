"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { toWebpBlob } from "@/lib/student-images";
import { fetchWithRequestId } from "@/lib/request-id";
import { COOKIE_NOTICE_VERSION, PLATFORM_TERMS_VERSION, PRIVACY_NOTICE_VERSION, USER_AGREEMENT_VERSION } from "@/lib/constants";

function makeSlug(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export function SchoolRegistrationForm() {
  const supabase = getSupabaseBrowserClient();
  const [sessionToken, setSessionToken] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [website, setWebsite] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ name: string; slug: string; url: string; teacherUrl: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (!supabase) { setChecking(false); return; }
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSessionToken(data.session?.access_token ?? "");
      setAccountEmail(data.session?.user.email ?? "");
      if (!contactEmail && data.session?.user.email) setContactEmail(data.session.user.email);
      setChecking(false);
    });
    return () => { active = false; };
  }, [supabase, contactEmail]);

  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  async function onLogoChange(file?: File) {
    if (!file) return;
    setError("");
    try {
      const blob = await toWebpBlob(file);
      if (blob.size > 1024 * 1024) throw new Error("Choose a smaller logo (under 1 MB after processing).");
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogo(new File([blob], "school-logo.webp", { type: "image/webp" }));
      setLogoPreview(URL.createObjectURL(blob));
    } catch (caught) {
      setLogo(null);
      setError(caught instanceof Error ? caught.message : "Could not process this logo.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess(null);
    try {
      const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
      const token = data.session?.access_token || sessionToken;
      if (!token) throw new Error("Your teacher session expired. Sign in again and reopen this page.");
      if (!logo) throw new Error("Upload your school logo to continue.");
      const form = new FormData();
      form.set("name", name); form.set("shortName", shortName); form.set("slug", slug || makeSlug(name));
      form.set("contactEmail", contactEmail); form.set("phone", phone); form.set("address", address);
      form.set("city", city); form.set("province", province); form.set("website", website); form.set("logo", logo, "school-logo.webp");
      form.set("legalAcceptance", legalAccepted ? "accepted" : "");
      form.set("platformTermsVersion", PLATFORM_TERMS_VERSION);
      form.set("userAgreementVersion", USER_AGREEMENT_VERSION);
      form.set("privacyNoticeVersion", PRIVACY_NOTICE_VERSION);
      form.set("cookieNoticeVersion", COOKIE_NOTICE_VERSION);
      const response = await fetchWithRequestId("/api/schools/register", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "School registration failed.");
      setSuccess({ name: payload.schoolName, slug: payload.slug, url: payload.url, teacherUrl: payload.teacherUrl });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "School registration failed.");
    } finally { setBusy(false); }
  }

  if (checking) return <main className="school-register-page"><section className="school-register-card"><p>Checking teacher sign-in…</p></section></main>;
  if (!supabase || !sessionToken) return <main className="school-register-page"><section className="school-register-card"><span className="section-kicker">GUROVIA SCHOOL PLATFORM</span><h1>Register your school</h1><p>First create or sign in to a teacher account. After signing in, return here to create a school portal and its personalized link.</p><Link className="button button-primary" href="/teacher">Open teacher sign in <span aria-hidden="true">→</span></Link><p className="school-register-footnote">Already signed in under another account? Sign out first, then use the account that should own this school.</p></section></main>;
  if (success) return <main className="school-register-page"><section className="school-register-card"><span className="section-kicker">SCHOOL CREATED</span><h1>{success.name}</h1><p>Your school portal is ready.</p><label className="field"><span>Personalized school URL</span><input readOnly value={`${window.location.origin}${success.url}`} onFocus={(event) => event.currentTarget.select()} /></label><div className="school-register-actions"><Link className="button button-primary" href={success.teacherUrl}>Open school portal <span aria-hidden="true">→</span></Link><button type="button" className="button button-outline" onClick={() => void navigator.clipboard.writeText(`${window.location.origin}${success.url}`)}>Copy school link</button></div><p className="school-register-footnote">School owner account: {accountEmail}. Invite teachers by sharing the school link; their access requests must be approved by a school owner or administrator.</p></section></main>;

  return <main className="school-register-page"><section className="school-register-card"><span className="section-kicker">GUROVIA SCHOOL PLATFORM</span><h1>Register your school</h1><p>Create your school profile and receive a dedicated link for students and teachers.</p>
    <form method="post" className="school-register-form" onSubmit={submit}>
      <label className="field"><span>Official school name</span><input required minLength={3} maxLength={160} value={name} onChange={(event) => { setName(event.target.value); if (!slugEdited) setSlug(makeSlug(event.target.value)); if (!shortName) setShortName(event.target.value.trim().slice(0, 24)); }} placeholder="e.g. Example National High School" /></label>
      <div className="school-register-grid"><label className="field"><span>Short name</span><input required minLength={2} maxLength={48} value={shortName} onChange={(event) => setShortName(event.target.value)} placeholder="e.g. ENHS" /></label><label className="field"><span>School link / slug</span><input required minLength={3} maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(makeSlug(event.target.value)); }} placeholder="your-school-name" /><small>Lowercase letters, numbers and hyphens.</small></label></div>
      <label className="field"><span>Official contact email</span><input required type="email" maxLength={254} value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} /></label>
      <div className="school-register-grid"><label className="field"><span>Phone (optional)</span><input maxLength={32} value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label className="field"><span>Website (optional)</span><input type="url" maxLength={240} value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://school.gov.ph" /></label></div>
      <label className="field"><span>Address (optional)</span><input maxLength={240} value={address} onChange={(event) => setAddress(event.target.value)} /></label>
      <div className="school-register-grid"><label className="field"><span>City / municipality</span><input maxLength={100} value={city} onChange={(event) => setCity(event.target.value)} placeholder="Municipality" /></label><label className="field"><span>Province / region</span><input maxLength={100} value={province} onChange={(event) => setProvince(event.target.value)} placeholder="Province" /></label></div>
      <label className="field"><span>School logo (required, under 1 MB)</span><input type="file" accept="image/*" required onChange={(event) => void onLogoChange(event.target.files?.[0])} />{logoPreview && <img className="school-register-logo-preview" src={logoPreview} alt="School logo preview" />}</label>
      <label className="consent-row school-legal-acceptance"><input type="checkbox" required checked={legalAccepted} onChange={(event) => setLegalAccepted(event.target.checked)} /><span>I am authorized to register this school. I agree to GuroVia's <Link href="/terms" target="_blank">Terms of Service</Link> and <Link href="/agreement" target="_blank">Agreement of Use</Link>, and acknowledge the <Link href="/privacy" target="_blank">Privacy Policy</Link> and <Link href="/cookies" target="_blank">Cookie Policy</Link>. I understand each school must review and publish its own verified privacy notice before inviting students. This does not opt me into optional analytics.</span></label>
      {error && <p role="alert" className="form-alert error-alert">{error}</p>}
      <button type="submit" className="button button-primary school-register-submit" disabled={busy || !logo || !legalAccepted}>{busy ? "Creating school…" : "Create school portal"}</button>
      <p className="school-register-footnote">You are registering as the initial school owner. Other teachers must request access and be approved before they can manage class records. Technical support: <a href="mailto:DarrenBardelas.Dev@Gmail.Com">LibarriumX</a>.</p>
    </form>
  </section></main>;
}
