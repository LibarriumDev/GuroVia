"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Brand } from "@/components/brand";

type Stage = 0 | 1 | 2 | 3 | 4;

const stages = ["School profile", "Review", "Portal link", "Staff setup", "Students & grades"];

function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export function SchoolRegistrationSimulator() {
  const [stage, setStage] = useState<Stage>(0);
  const [schoolName, setSchoolName] = useState("Example National High School");
  const [shortName, setShortName] = useState("ENHS");
  const [contactEmail, setContactEmail] = useState("admin@example.com");
  const [city, setCity] = useState("Sample Municipality");
  const [province, setProvince] = useState("Example Province");
  const [logoPreview, setLogoPreview] = useState("");
  const [logoLabel, setLogoLabel] = useState("No logo selected — optional for this demo");
  const [teacherApproved, setTeacherApproved] = useState(false);
  const [sectionName, setSectionName] = useState("Grade 4 – Sampaguita");
  const [sectionCreated, setSectionCreated] = useState(false);
  const [studentAdded, setStudentAdded] = useState(false);
  const [gradesSaved, setGradesSaved] = useState(false);
  const [notice, setNotice] = useState("");

  const slug = useMemo(() => slugify(schoolName) || "your-school", [schoolName]);
  const demoLinks = [
    { label: "School home", url: `/s/${slug}` },
    { label: "Teacher portal", url: `/s/${slug}/teacher` },
    { label: "Student portal", url: `/s/${slug}/student` },
  ];

  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

  function chooseLogo(file?: File) {
    if (!file) return;
    setNotice("");
    if (!file.type.startsWith("image/")) { setNotice("Choose an image file for the local preview."); return; }
    if (file.size > 3 * 1024 * 1024) { setNotice("Choose an image smaller than 3 MB for the local preview."); return; }
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(URL.createObjectURL(file));
    setLogoLabel(file.name);
  }

  function next() {
    setNotice("");
    if (stage === 0) {
      if (schoolName.trim().length < 3 || shortName.trim().length < 2) { setNotice("Enter a school name and short name to continue."); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) { setNotice("Enter an example contact email in a valid format."); return; }
    }
    if (stage === 3 && (!teacherApproved || !sectionCreated)) { setNotice("For this demo, approve the sample teacher and create a section first."); return; }
    setStage((current) => Math.min(4, current + 1) as Stage);
  }

  function reset() {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setStage(0);
    setSchoolName("Example National High School");
    setShortName("ENHS");
    setContactEmail("admin@example.com");
    setCity("Sample Municipality");
    setProvince("Example Province");
    setLogoPreview("");
    setLogoLabel("No logo selected — optional for this demo");
    setTeacherApproved(false);
    setSectionName("Grade 4 – Sampaguita");
    setSectionCreated(false);
    setStudentAdded(false);
    setGradesSaved(false);
    setNotice("");
  }

  async function copyDemoLink(path: string) {
    const url = `https://gurovia.example${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice(`Copied example link: ${url}`);
    } catch {
      setNotice(`Example link: ${url}`);
    }
  }

  return (
    <main className="school-simulator-page">
      <header className="school-simulator-header">
        <Brand />
        <Link href="/" className="button button-outline">Back to GuroVia</Link>
      </header>

      <section className="school-simulator-shell" aria-labelledby="simulator-heading">
        <div className="school-simulator-intro">
          <span className="section-kicker">INTERACTIVE WALKTHROUGH</span>
          <h1 id="simulator-heading">See how school registration works.</h1>
          <p>Enter example school details, preview the school link, and walk through staff setup and grade entry.</p>
          <div className="school-simulator-safety"><span aria-hidden="true">ⓘ</span><span><strong>Simulation only.</strong> No school, account, logo, student, or grade record is sent to GuroVia or saved to a database. Use example details, not real personal information.</span></div>
        </div>

        <nav className="school-simulator-progress" aria-label="Simulation steps">
          {stages.map((label, index) => (
            <div className={`school-simulator-progress-step${stage === index ? " is-current" : ""}${stage > index ? " is-done" : ""}`} key={label}>
              <span>{stage > index ? "✓" : index + 1}</span><small>{label}</small>
            </div>
          ))}
        </nav>

        <section className="school-simulator-card">
          {stage === 0 && <>
            <div className="school-simulator-card-heading"><span>STEP 1 OF 5</span><h2>Set up a school profile</h2><p>The real process starts with a verified teacher account. This demo lets you preview the details step without signing in or creating records.</p></div>
            <div className="school-simulator-form">
              <label className="field"><span>Official school name</span><input value={schoolName} maxLength={160} onChange={(event) => { setSchoolName(event.target.value); if (!shortName || shortName === "SNHS") setShortName(event.target.value.trim().slice(0, 24)); }} placeholder="Sample National High School" /></label>
              <div className="school-simulator-grid"><label className="field"><span>Short name</span><input value={shortName} maxLength={48} onChange={(event) => setShortName(event.target.value)} placeholder="SNHS" /></label><label className="field"><span>School link name</span><input value={slug} readOnly /><small>Generated from the school name.</small></label></div>
              <label className="field"><span>Official contact email</span><input value={contactEmail} maxLength={254} type="email" onChange={(event) => setContactEmail(event.target.value)} placeholder="admin@example.edu.ph" /></label>
              <div className="school-simulator-grid"><label className="field"><span>City / municipality</span><input value={city} maxLength={100} onChange={(event) => setCity(event.target.value)} /></label><label className="field"><span>Province / region</span><input value={province} maxLength={100} onChange={(event) => setProvince(event.target.value)} /></label></div>
              <div className="school-simulator-logo-field"><div className="school-simulator-logo-preview">{logoPreview ? <img src={logoPreview} alt="Selected sample school logo preview" /> : <span>{shortName.trim().slice(0, 2).toUpperCase() || "GV"}</span>}</div><div><strong>School logo</strong><p>{logoLabel}</p><label className="button button-outline school-simulator-file-button">Choose sample logo<input type="file" accept="image/*" onChange={(event) => chooseLogo(event.target.files?.[0])} /></label><small>Optional here; real registration requires a WebP logo under 1 MB. The image stays in this browser tab.</small></div></div>
            </div>
            <div className="school-simulator-actions"><Link href="/schools/register" className="school-simulator-text-link">Go to real registration</Link><button type="button" className="button button-primary" onClick={next}>Review school details <span aria-hidden="true">→</span></button></div>
          </>}

          {stage === 1 && <>
            <div className="school-simulator-card-heading"><span>STEP 2 OF 5</span><h2>Review your school profile</h2><p>In the real flow, you sign in with a verified teacher account and accept the platform terms before submission.</p></div>
            <div className="school-simulator-review"><div className="school-simulator-school-mark">{logoPreview ? <img src={logoPreview} alt="Sample school logo" /> : <span>{shortName.trim().slice(0, 2).toUpperCase() || "GV"}</span>}</div><div><h3>{schoolName.trim() || "Your school name"}</h3><p>{shortName.trim()} · {[city, province].filter(Boolean).join(", ") || "Location not provided"}</p><small>{contactEmail}</small></div></div>
            <div className="school-simulator-detail-row"><span>Generated link name</span><code>{slug}</code></div>
            <div className="school-simulator-detail-row"><span>Logo</span><strong>{logoPreview ? "Selected for preview" : "Initials placeholder"}</strong></div>
            <div className="school-simulator-info"><strong>What the live form does</strong><p>It verifies your signed-in account, checks that the school link is available, stores school information, processes the logo, and assigns the registering account as the initial school owner.</p></div>
            <div className="school-simulator-actions"><button type="button" className="button button-outline" onClick={() => setStage(0)}>← Edit details</button><button type="button" className="button button-primary" onClick={() => { setStage(2); setNotice(""); }}>Simulate registration <span aria-hidden="true">→</span></button></div>
          </>}

          {stage === 2 && <>
            <div className="school-simulator-success-mark" aria-hidden="true">✓</div>
            <div className="school-simulator-card-heading school-simulator-centered"><span>STEP 3 OF 5 · SIMULATED SUCCESS</span><h2>Your school portal is ready.</h2><p>This is a preview only. No actual school has been registered.</p></div>
            <div className="school-simulator-review school-simulator-review-created"><div className="school-simulator-school-mark">{logoPreview ? <img src={logoPreview} alt="Sample school logo" /> : <span>{shortName.trim().slice(0, 2).toUpperCase() || "GV"}</span>}</div><div><h3>{schoolName.trim()}</h3><p>{[city, province].filter(Boolean).join(", ")}</p><span className="school-simulator-status">Example portal created</span></div></div>
            <div className="school-simulator-links"><h3>Personalized school links</h3>{demoLinks.map((link) => <div className="school-simulator-link-row" key={link.label}><div><span>{link.label}</span><code>{link.url}</code></div><button type="button" className="button button-outline" onClick={() => void copyDemoLink(link.url)}>Copy demo URL</button></div>)}<p>These use the reserved example domain <code>gurovia.example</code>. They are not live portal addresses.</p></div>
            <div className="school-simulator-info"><strong>Next, set up staff access.</strong><p>In the live platform, teachers visit the school link, sign in, request membership, and wait for approval from the school owner or administrator.</p></div>
            <div className="school-simulator-actions"><button type="button" className="button button-outline" onClick={() => setStage(1)}>← Back</button><button type="button" className="button button-primary" onClick={() => { setStage(3); setNotice(""); }}>Continue to staff setup <span aria-hidden="true">→</span></button></div>
          </>}

          {stage === 3 && <>
            <div className="school-simulator-card-heading"><span>STEP 4 OF 5</span><h2>Approve staff and create a section.</h2><p>School owners control who can access class records.</p></div>
            <div className="school-simulator-task"><div className="school-simulator-task-copy"><span className="school-simulator-task-icon" aria-hidden="true">1</span><div><strong>Teacher membership request</strong><p>Maria Santos · maria.teacher@example.com</p><small>This is a fictional teacher used for demonstration.</small></div></div><span className={`school-simulator-status${teacherApproved ? " is-approved" : " is-pending"}`}>{teacherApproved ? "Approved" : "Pending"}</span><button type="button" className={`button ${teacherApproved ? "button-outline" : "button-primary"}`} onClick={() => setTeacherApproved((value) => !value)}>{teacherApproved ? "Undo approval" : "Approve teacher"}</button></div>
            <div className="school-simulator-task school-simulator-task-section"><div className="school-simulator-task-copy"><span className="school-simulator-task-icon" aria-hidden="true">2</span><div><strong>Create a class section</strong><p>Sections determine which students and grades a teacher can manage.</p></div></div><label className="field"><span>Section name</span><input value={sectionName} maxLength={100} onChange={(event) => { setSectionName(event.target.value); setSectionCreated(false); }} /></label><button type="button" className={`button ${sectionCreated ? "button-outline" : "button-primary"}`} onClick={() => { if (sectionName.trim().length < 2) { setNotice("Enter a section name first."); return; } setSectionCreated((value) => !value); setNotice(""); }}>{sectionCreated ? "Section created ✓" : "Create sample section"}</button></div>
            <div className="school-simulator-info"><strong>Access stays within the school.</strong><p>On the live platform, teacher approval and section assignments are checked by the server and database policies. A school URL alone does not grant access.</p></div>
            <div className="school-simulator-actions"><button type="button" className="button button-outline" onClick={() => setStage(2)}>← Back</button><button type="button" className="button button-primary" onClick={next}>Continue to student grades <span aria-hidden="true">→</span></button></div>
          </>}

          {stage === 4 && <>
            <div className="school-simulator-card-heading"><span>STEP 5 OF 5</span><h2>Enroll students and record grades.</h2><p>Teachers add students to their sections, create assessment columns, and enter scores for Term 1, Term 2, and Term 3.</p></div>
            <div className="school-simulator-class-summary"><div><span>School</span><strong>{schoolName.trim()}</strong></div><div><span>Section</span><strong>{sectionCreated ? sectionName : "Sample section"}</strong></div><div><span>Teacher access</span><strong>{teacherApproved ? "Approved" : "Demo completed"}</strong></div></div>
            <div className="school-simulator-grade-demo"><div className="school-simulator-grade-demo-heading"><div><span className="section-kicker">SAMPLE CLASS RECORD</span><h3>Science · Term 1</h3></div><span className="school-simulator-status">Demo data</span></div><div className="school-simulator-fake-table"><div className="school-simulator-fake-row is-header"><span>Student</span><span>WW 1</span><span>PT 1</span><span>Exam</span></div><div className="school-simulator-fake-row"><span>Sample Student A</span><span>18/20</span><span>23/25</span><span>42/50</span></div>{studentAdded && <div className="school-simulator-fake-row"><span>Sample Student B</span><span>16/20</span><span>21/25</span><span>39/50</span></div>}</div><p>All names and scores shown here are fictional examples.</p></div>
            <div className="school-simulator-actions school-simulator-final-actions"><button type="button" className="button button-outline" onClick={() => setStudentAdded((value) => !value)}>{studentAdded ? "Remove second sample student" : "Add another sample student"}</button><button type="button" className="button button-primary" onClick={() => setGradesSaved(true)}>{gradesSaved ? "Sample grades saved ✓" : "Save sample grades"}</button></div>
            {gradesSaved && <div role="status" className="school-simulator-info"><strong>Walkthrough complete.</strong><p>The sample process is finished. Nothing was saved to GuroVia. In the real platform, grades are saved to your school's secured records and students can view their own report.</p></div>}
            <div className="school-simulator-actions"><button type="button" className="button button-outline" onClick={() => setStage(3)}>← Back to staff setup</button><button type="button" className="button button-primary" onClick={reset}>Restart simulation</button></div>
          </>}
          {notice && <p role="status" className="school-simulator-notice">{notice}</p>}
        </section>
        <p className="school-simulator-footer-note">Use sample details only. To create a real school portal, go to <Link href="/schools/register">school registration</Link>.</p>
      </section>
    </main>
  );
}
