"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type ScoreCategory = "Written Works" | "Performance Tasks" | "Summative Test/Exam";
type GradebookAssessment = {
  id: string;
  section_id: string;
  subject_name: string;
  term_number: number;
  category: ScoreCategory;
  assessment_name: string;
  max_score: number | string;
  assessed_on: string;
  created_by: string;
  created_at: string;
};
type GradebookScore = {
  assessment_id: string;
  student_id: string;
  score: number | string | null;
};
type GradebookSubject = { id: string; subject_name: string; created_at?: string };
type ClassStudent = { id: string; full_name: string };
type Weights = Record<ScoreCategory, number>;

const CATEGORY_ORDER: ScoreCategory[] = ["Written Works", "Performance Tasks", "Summative Test/Exam"];
const CATEGORY_LABELS: Record<ScoreCategory, string> = {
  "Written Works": "Written / Oral Works",
  "Performance Tasks": "Product / Performance Tasks",
  "Summative Test/Exam": "Summative Tests / Term Examinations"
};
const DEFAULT_WEIGHTS: Weights = { "Written Works": 20, "Performance Tasks": 50, "Summative Test/Exam": 30 };

function cellKey(assessmentId: string, studentId: string) {
  return `${assessmentId}:${studentId}`;
}

function calculateWeightedScore(
  studentId: string,
  assessments: GradebookAssessment[],
  scoreMap: Record<string, string>,
  weights: Weights
): number | null {
  if (!assessments.length || CATEGORY_ORDER.reduce((sum, category) => sum + weights[category], 0) !== 100) return null;
  let weighted = 0;
  for (const category of CATEGORY_ORDER) {
    const categoryWeight = weights[category];
    if (categoryWeight === 0) continue;
    const grouped = assessments.filter((assessment) => assessment.category === category);
    if (!grouped.length) return null;
    let earned = 0;
    let possible = 0;
    for (const assessment of grouped) {
      const raw = scoreMap[cellKey(assessment.id, studentId)];
      if (raw === undefined || raw.trim() === "") return null;
      const score = Number(raw);
      const max = Number(assessment.max_score);
      if (!Number.isFinite(score) || score < 0 || score > max || max <= 0) return null;
      earned += score;
      possible += max;
    }
    if (possible <= 0) return null;
    weighted += (earned / possible) * 100 * (categoryWeight / 100);
  }
  return Math.round(weighted * 100) / 100;
}

export function ClassScorebook({
  sectionId,
  sectionLabel,
  academicYear,
  students,
  userId,
  initialDate
}: {
  sectionId: string;
  sectionLabel: string;
  academicYear: string;
  students: ClassStudent[];
  userId: string;
  initialDate: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const [subjects, setSubjects] = useState<GradebookSubject[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [activeSubject, setActiveSubject] = useState("");
  const [activeTerm, setActiveTerm] = useState(1);
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [weightsLoadedFor, setWeightsLoadedFor] = useState("");
  const [weightStorageError, setWeightStorageError] = useState(false);
  const [assessments, setAssessments] = useState<GradebookAssessment[]>([]);
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
  const [changedCells, setChangedCells] = useState<Record<string, true>>({});
  const [category, setCategory] = useState<ScoreCategory>("Written Works");
  const [assessmentName, setAssessmentName] = useState("");
  const [maxScore, setMaxScore] = useState("20");
  const [assessmentDate, setAssessmentDate] = useState(initialDate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const studentIds = useMemo(() => students.map((student) => student.id), [students]);
  const studentIdsKey = useMemo(() => studentIds.join(","), [studentIds]);
  const weightsStorageKey = activeSubject.trim()
    ? `gurovia:scorebook-weights:${sectionId}:${encodeURIComponent(activeSubject.trim().toLocaleLowerCase())}`
    : "";
  const weightsReady = !weightsStorageKey || weightsLoadedFor === weightsStorageKey;
  const weightsTotal = CATEGORY_ORDER.reduce((sum, item) => sum + weights[item], 0);
  const weightsValid = Number.isInteger(weightsTotal) && weightsTotal === 100 && CATEGORY_ORDER.every((item) => Number.isInteger(weights[item]) && weights[item] >= 0 && weights[item] <= 100);
  const sortedAssessments = useMemo(() => [...assessments].sort((left, right) => {
    const categoryDelta = CATEGORY_ORDER.indexOf(left.category) - CATEGORY_ORDER.indexOf(right.category);
    return categoryDelta || left.assessed_on.localeCompare(right.assessed_on) || left.created_at.localeCompare(right.created_at);
  }), [assessments]);
  const visibleStudents = useMemo(() => students.filter((student) => student.full_name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [students, search]);

  const loadSubjects = useCallback(async () => {
    if (!supabase || !sectionId) { setSubjects([]); setActiveSubject(""); return; }
    const { data, error: subjectError } = await supabase
      .from("gradebook_subjects")
      .select("id, subject_name, created_at")
      .eq("section_id", sectionId)
      .order("subject_name", { ascending: true });
    if (subjectError) {
      console.error("[class-scorebook] Subject catalogue query failed:", subjectError);
      setError("The subject list could not load. Apply the subject-roster migration, then reload the scorebook.");
      setSubjects([]);
      setActiveSubject("");
      return;
    }
    const listed = (data ?? []) as GradebookSubject[];
    setSubjects(listed);
    setActiveSubject((current) => {
      const match = listed.find((subject) => subject.subject_name.toLocaleLowerCase() === current.trim().toLocaleLowerCase());
      return match?.subject_name ?? listed[0]?.subject_name ?? "";
    });
  }, [supabase, sectionId]);

  useEffect(() => { void loadSubjects(); }, [loadSubjects]);

  const loadScorebook = useCallback(async () => {
    if (!supabase || !sectionId || !activeSubject.trim()) {
      setAssessments([]);
      setScoreInputs({});
      setChangedCells({});
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const { data: assessmentRows, error: assessmentError } = await supabase
      .from("gradebook_assessments")
      .select("id, section_id, subject_name, term_number, category, assessment_name, max_score, assessed_on, created_by, created_at")
      .eq("section_id", sectionId)
      .eq("subject_name", activeSubject.trim())
      .eq("term_number", activeTerm)
      .order("created_at", { ascending: true });

    if (assessmentError) {
      console.error("[class-scorebook] Assessment query failed:", assessmentError);
      setError("The class scorebook could not load. Apply the class scorebook Supabase migration, then reload this page.");
      setAssessments([]);
      setScoreInputs({});
      setLoading(false);
      return;
    }

    const listed = (assessmentRows ?? []) as GradebookAssessment[];
    const nextScores: Record<string, string> = {};
    if (listed.length && studentIds.length) {
      const { data: scoreRows, error: scoreError } = await supabase
        .from("gradebook_scores")
        .select("assessment_id, student_id, score")
        .in("assessment_id", listed.map((assessment) => assessment.id))
        .in("student_id", studentIds);
      if (scoreError) {
        console.error("[class-scorebook] Score query failed:", scoreError);
        setError("Assessment columns loaded, but saved scores could not be read. Check the Supabase migration and teacher permissions.");
        setLoading(false);
        return;
      }
      for (const row of (scoreRows ?? []) as GradebookScore[]) {
        nextScores[cellKey(row.assessment_id, row.student_id)] = row.score === null ? "" : String(row.score);
      }
    }
    // Keep every roster cell present so empty scores stay visibly distinct from a score of zero.
    for (const assessment of listed) {
      for (const studentId of studentIds) {
        const key = cellKey(assessment.id, studentId);
        if (!(key in nextScores)) nextScores[key] = "";
      }
    }
    setAssessments(listed);
    setScoreInputs(nextScores);
    setChangedCells({});
    setLoading(false);
  }, [supabase, sectionId, activeSubject, activeTerm, studentIdsKey]);

  useEffect(() => { void loadScorebook(); }, [loadScorebook]);
  useEffect(() => {
    if (!weightsStorageKey) {
      setWeights(DEFAULT_WEIGHTS);
      setWeightsLoadedFor("");
      setWeightStorageError(false);
      return;
    }

    let nextWeights = DEFAULT_WEIGHTS;
    try {
      const saved = window.localStorage.getItem(weightsStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Weights>;
        const candidate = Object.fromEntries(CATEGORY_ORDER.map((item) => [item, parsed[item]])) as Weights;
        const total = CATEGORY_ORDER.reduce((sum, item) => sum + candidate[item], 0);
        if (CATEGORY_ORDER.every((item) => Number.isInteger(candidate[item]) && candidate[item] >= 0 && candidate[item] <= 100) && total === 100) {
          nextWeights = candidate;
        }
      }
      setWeightStorageError(false);
    } catch {
      setWeightStorageError(true);
    }
    setWeights(nextWeights);
    setWeightsLoadedFor(weightsStorageKey);
  }, [weightsStorageKey]);

  useEffect(() => {
    if (!weightsStorageKey || !weightsReady || !weightsValid) return;
    try {
      window.localStorage.setItem(weightsStorageKey, JSON.stringify(weights));
      setWeightStorageError(false);
    } catch {
      setWeightStorageError(true);
    }
  }, [weights, weightsReady, weightsStorageKey, weightsValid]);

  function updateWeight(categoryToUpdate: ScoreCategory, rawValue: string) {
    const value = rawValue === "" ? 0 : Number(rawValue);
    if (!Number.isInteger(value) || value < 0 || value > 100) return;
    setWeights((current) => ({ ...current, [categoryToUpdate]: value }));
  }

  async function handleCreateSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setError("Supabase is not configured."); return; }
    const cleanName = newSubjectName.trim().replace(/\s+/g, " ");
    if (cleanName.length < 2 || cleanName.length > 80) { setError("Enter a subject name between 2 and 80 characters."); return; }
    setSaving(true); setError(""); setNotice("");
    const { data, error: createError } = await supabase.rpc("create_gradebook_subject", {
      p_section_id: sectionId,
      p_subject_name: cleanName
    });
    if (createError) {
      console.error("[class-scorebook] Subject create failed:", createError);
      setError("The subject could not be saved. Verify the subject-roster migration and your section access.");
      setSaving(false);
      return;
    }
    const returned = (Array.isArray(data) ? data[0] : data) as GradebookSubject | null;
    if (!returned?.subject_name) {
      setError("The subject was not returned after saving. Refresh the scorebook and try again.");
      setSaving(false);
      return;
    }
    setSubjects((current) => {
      const exists = current.some((subject) => subject.subject_name.toLocaleLowerCase() === returned.subject_name.toLocaleLowerCase());
      return exists ? current : [...current, returned].sort((a, b) => a.subject_name.localeCompare(b.subject_name));
    });
    setActiveSubject(returned.subject_name);
    setNewSubjectName("");
    setNotice(`“${returned.subject_name}” is saved for this section and will appear in the subject dropdown next time.`);
    setSaving(false);
  }

  async function handleAddSubjectToRoster() {
    if (!supabase || !activeSubject || !subjects.some((subject) => subject.subject_name === activeSubject)) {
      setError("Choose a saved subject before adding it to the roster.");
      return;
    }
    if (!students.length) { setNotice("No registered students are in this section yet. Students will be included when they register."); return; }
    setSaving(true); setError(""); setNotice("");
    const { data, error: rosterError } = await supabase.rpc("add_subject_to_section_roster", {
      p_section_id: sectionId,
      p_subject_name: activeSubject
    });
    if (rosterError) {
      console.error("[class-scorebook] Subject roster action failed:", rosterError);
      setError("The subject could not be added to the grade roster. Check the subject-roster migration and section access.");
    } else {
      const count = Number(data ?? 0);
      setNotice(count > 0
        ? `“${activeSubject}” was added to ${count} student grade record${count === 1 ? "" : "s"}. Existing marks were preserved.`
        : `“${activeSubject}” is already on every student's grade record. Existing marks were preserved.`);
    }
    setSaving(false);
  }

  async function handleAddAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) { setError("Supabase is not configured."); return; }
    setError(""); setNotice("");
    const cleanName = assessmentName.trim().replace(/\s+/g, " ");
    const max = Number(maxScore);
    if (cleanName.length < 2 || cleanName.length > 100) { setError("Enter an assessment name between 2 and 100 characters."); return; }
    if (!Number.isFinite(max) || max <= 0 || max > 100000) { setError("Maximum score must be greater than 0 and no more than 100,000."); return; }
    if (!activeSubject.trim() || !subjects.some((subject) => subject.subject_name === activeSubject)) { setError("Create or choose a saved subject before adding an assessment."); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(assessmentDate) || Number.isNaN(new Date(`${assessmentDate}T00:00:00`).getTime())) { setError("Choose a valid assessment date."); return; }

    setSaving(true);
    const { error: insertError } = await supabase.from("gradebook_assessments").insert({
      section_id: sectionId,
      subject_name: activeSubject.trim(),
      term_number: activeTerm,
      category,
      assessment_name: cleanName,
      max_score: max,
      assessed_on: assessmentDate,
      created_by: userId
    });
    if (insertError) {
      console.error("[class-scorebook] Assessment insert failed:", insertError);
      setError(insertError.code === "23505" ? "An assessment with this name already exists in this subject and term." : "The assessment could not be saved. Check the class scorebook migration and try again.");
      setSaving(false);
      return;
    }
    setAssessmentName("");
    setNotice("Assessment column added. Enter scores for the students, then select Save scores.");
    await loadScorebook();
    setSaving(false);
  }

  function handleScoreChange(assessment: GradebookAssessment, studentId: string, value: string) {
    const key = cellKey(assessment.id, studentId);
    setScoreInputs((previous) => ({ ...previous, [key]: value }));
    setChangedCells((previous) => ({ ...previous, [key]: true }));
    setError("");
    setNotice("");
  }

  async function handleSaveScores() {
    if (!supabase || !Object.keys(changedCells).length) return;
    setError(""); setNotice("");
    const assessmentById = new Map(assessments.map((assessment) => [assessment.id, assessment]));
    const payload: { assessment_id: string; student_id: string; score: number | null; updated_by: string; updated_at: string }[] = [];
    for (const key of Object.keys(changedCells)) {
      const [assessmentId, studentId] = key.split(":");
      const assessment = assessmentById.get(assessmentId);
      if (!assessment || !studentIds.includes(studentId)) continue;
      const raw = scoreInputs[key] ?? "";
      if (raw.trim() === "") {
        payload.push({ assessment_id: assessmentId, student_id: studentId, score: null, updated_by: userId, updated_at: new Date().toISOString() });
        continue;
      }
      const score = Number(raw);
      const maximum = Number(assessment.max_score);
      if (!Number.isFinite(score) || score < 0 || score > maximum) {
        const studentName = students.find((student) => student.id === studentId)?.full_name ?? "the selected student";
        setError(`Invalid score for ${studentName}, ${assessment.assessment_name}. Enter a score from 0 to ${maximum}, or leave it blank.`);
        return;
      }
      payload.push({ assessment_id: assessmentId, student_id: studentId, score, updated_by: userId, updated_at: new Date().toISOString() });
    }
    if (!payload.length) return;
    setSaving(true);
    const { error: saveError } = await supabase.from("gradebook_scores").upsert(payload, { onConflict: "assessment_id,student_id" });
    if (saveError) {
      console.error("[class-scorebook] Score save failed:", saveError);
      setError("Scores could not be saved. Verify the migration and make sure each student belongs to this class section.");
      setSaving(false);
      return;
    }
    setNotice(`${payload.length} score cell${payload.length === 1 ? "" : "s"} saved successfully.`);
    await loadScorebook();
    setSaving(false);
  }

  async function handleDeleteAssessment(assessment: GradebookAssessment) {
    if (!supabase || !window.confirm(`Delete “${assessment.assessment_name}” and its saved student scores? This cannot be undone.`)) return;
    setError(""); setNotice(""); setSaving(true);
    const { error: deleteError } = await supabase.from("gradebook_assessments").delete().eq("id", assessment.id).eq("section_id", sectionId);
    if (deleteError) {
      console.error("[class-scorebook] Assessment delete failed:", deleteError);
      setError("This assessment could not be deleted. Check your teacher permissions.");
    } else {
      setNotice("Assessment and its saved scores were deleted.");
      await loadScorebook();
    }
    setSaving(false);
  }

  const computedGrades = useMemo(() => students.map((student) => ({
    studentId: student.id,
    value: weightsReady && weightsValid ? calculateWeightedScore(student.id, sortedAssessments, scoreInputs, weights) : null
  })), [students, sortedAssessments, scoreInputs, weights, weightsReady, weightsValid]);
  const classAverage = useMemo(() => {
    const reported = computedGrades.map((grade) => grade.value).filter((value): value is number => value !== null);
    return reported.length ? Math.round((reported.reduce((sum, value) => sum + value, 0) / reported.length) * 100) / 100 : null;
  }, [computedGrades]);
  const enteredCells = useMemo(() => sortedAssessments.reduce((count, assessment) => count + students.filter((student) => (scoreInputs[cellKey(assessment.id, student.id)] ?? "").trim() !== "").length, 0), [sortedAssessments, students, scoreInputs]);
  const expectedCells = sortedAssessments.length * students.length;
  const missingCells = Math.max(0, expectedCells - enteredCells);
  const hasAnyEditedCell = Object.keys(changedCells).length > 0;
  const categoriesPresent = new Set(sortedAssessments.map((assessment) => assessment.category));

  return (
    <section className="class-scorebook-panel" aria-labelledby="class-scorebook-heading">
      <div className="scorebook-title-row">
        <div>
          <span className="form-overline">CLASS SCOREBOOK</span>
          <h2 id="class-scorebook-heading">Assessment entry</h2>
          <p>{sectionLabel} · {academicYear}. Enter one score per student for each assessment, like a digital E-Class Record.</p>
        </div>
        <div className="scorebook-class-average"><span>COMPLETED INITIAL GRADES</span><strong>{classAverage === null ? "—" : classAverage.toFixed(2)}</strong><small>{!weightsReady ? "Loading saved weights…" : !weightsValid ? "Weight percentages must total 100%." : `${computedGrades.filter((grade) => grade.value !== null).length} of ${students.length} students complete`}</small></div>
      </div>

      <div className="scorebook-subject-manager">
        <div className="scorebook-controls">
          <label className="field"><span>Saved subject</span><select value={activeSubject} onChange={(event) => { setActiveSubject(event.target.value); setError(""); setNotice(""); }} disabled={!subjects.length || saving}><option value="">{subjects.length ? "Choose a subject" : "Create your first subject"}</option>{subjects.map((subject) => <option value={subject.subject_name} key={subject.id}>{subject.subject_name}</option>)}</select></label>
          <label className="field"><span>Term</span><select value={activeTerm} onChange={(event) => { setActiveTerm(Number(event.target.value)); setError(""); setNotice(""); }}>{[1, 2, 3].map((term) => <option value={term} key={term}>Term {term}</option>)}</select></label>
          <button className="button button-outline" type="button" onClick={() => void handleAddSubjectToRoster()} disabled={saving || !activeSubject}>{saving ? "Working…" : "+ Add subject to grade roster"}</button>
        </div>
        <form method="post" className="scorebook-create-subject" onSubmit={handleCreateSubject}>
          <label className="field"><span>Create a subject for this section</span><input value={newSubjectName} onChange={(event) => setNewSubjectName(event.target.value)} maxLength={80} minLength={2} placeholder="Type a subject once, e.g. Science" required /></label>
          <button className="button button-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "+ Save subject"}</button>
        </form>
      </div>

      <div className="scorebook-weight-row">
        <div className="scorebook-weight-panel" aria-labelledby="scorebook-weight-heading">
          <div className="scorebook-weight-heading">
            <div><span className="form-overline">GRADE WEIGHTS</span><h3 id="scorebook-weight-heading">Category percentages</h3></div>
            <button className="button button-outline" type="button" onClick={() => setWeights(DEFAULT_WEIGHTS)} disabled={!weightsReady || CATEGORY_ORDER.every((item) => weights[item] === DEFAULT_WEIGHTS[item])}>Restore default</button>
          </div>
          <div className="scorebook-weight-inputs">
            {CATEGORY_ORDER.map((item) => <label className="field" key={item}>
              <span>{CATEGORY_LABELS[item]}</span>
              <span className="scorebook-weight-input-wrap"><input type="number" min="0" max="100" step="1" inputMode="numeric" value={weights[item]} onChange={(event) => updateWeight(item, event.target.value)} disabled={!weightsReady} aria-label={`${CATEGORY_LABELS[item]} weight percentage`} /><span aria-hidden="true">%</span></span>
            </label>)}
          </div>
          <p className={`scorebook-weight-total ${weightsValid ? "is-valid" : "is-invalid"}`} role="status" aria-live="polite">
            {!weightsReady ? "Loading this subject’s saved weights…" : <>Total: <strong>{weightsTotal}%</strong> {weightsValid ? "· Grades use these weights." : "· Adjust the percentages so they total 100%. Grades are paused until then."}</>}
            {weightStorageError && <span> Changes could not be saved in this browser.</span>}
          </p>
        </div>
        <p className="scorebook-weight-help"><strong>Default: 20% / 50% / 30%.</strong> Choose the matching category when adding a quiz, activity, project, or exam; its score uses that category’s percentage. Valid totals save in this browser for each subject.</p>
      </div>

      <form method="post" className="scorebook-add-assessment" onSubmit={handleAddAssessment}>
        <div className="scorebook-section-heading"><div><span className="form-overline">ADD ASSESSMENT COLUMN</span><h3>{activeSubject || "Choose a subject"} · Term {activeTerm}</h3></div><span className="scorebook-small-tag">{sortedAssessments.length} assessment{sortedAssessments.length === 1 ? "" : "s"}</span></div>
        <div className="scorebook-add-grid">
          <label className="field"><span>Work category</span><select value={category} onChange={(event) => setCategory(event.target.value as ScoreCategory)}>{CATEGORY_ORDER.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>)}</select></label>
          <label className="field"><span>Assessment name</span><input value={assessmentName} onChange={(event) => setAssessmentName(event.target.value)} minLength={2} maxLength={100} required placeholder="e.g. Written Work 1" /></label>
          <label className="field"><span>Highest possible score</span><input type="number" min="0.01" max="100000" step="0.01" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} required /></label>
          <label className="field"><span>Date</span><input type="date" value={assessmentDate} onChange={(event) => setAssessmentDate(event.target.value)} required /></label>
          <button type="submit" className="button button-primary" disabled={saving || !activeSubject.trim() || !subjects.some((subject) => subject.subject_name === activeSubject)}>{saving ? "Saving…" : "+ Add assessment"}</button>
        </div>
      </form>

      {error && <p className="form-alert error-alert" role="alert">{error}</p>}
      {notice && <p className="form-alert success-alert" role="status">{notice}</p>}

      <div className="scorebook-summary-row">
        <span>{students.length} students</span>
        <span>{enteredCells} of {expectedCells} score cells entered</span>
        <span className={missingCells ? "scorebook-warning" : "scorebook-complete"}>{missingCells ? `${missingCells} missing` : "All entered"}</span>
        {hasAnyEditedCell && <button type="button" className="button button-primary scorebook-save" onClick={() => void handleSaveScores()} disabled={saving}>{saving ? "Saving scores…" : `Save ${Object.keys(changedCells).length} changed cells`}</button>}
      </div>

      <div className="scorebook-desktop-table-wrap scorebook-table-wrap">
        {loading ? <div className="scorebook-empty"><span className="spinner" /> Loading assessments and scores…</div> : !students.length ? <div className="scorebook-empty"><strong>No students in this class yet.</strong><p>Once students register in this section, they will appear as rows here.</p></div> : !sortedAssessments.length ? <div className="scorebook-empty"><strong>{activeSubject ? `No assessments for ${activeSubject}, Term ${activeTerm} yet.` : "Create or choose a saved subject first."}</strong><p>{activeSubject ? "Add the first Written Work, Performance Task and Summative Test/Exam above to set up the scorebook." : "Save a subject above. It will remain in the dropdown whenever you reopen this scorebook for this section."}</p></div> : (
          <table className="scorebook-table">
            <thead><tr><th className="scorebook-student-col">Student</th>{sortedAssessments.map((assessment) => <th key={assessment.id}><div className="scorebook-assessment-heading"><span className={`scorebook-category scorebook-${CATEGORY_ORDER.indexOf(assessment.category)}`}>{CATEGORY_LABELS[assessment.category]}</span><strong>{assessment.assessment_name}</strong><small>Max: {Number(assessment.max_score)}</small><button type="button" onClick={() => void handleDeleteAssessment(assessment)} aria-label={`Delete ${assessment.assessment_name}`} disabled={saving}>Delete column</button></div></th>)}<th className="scorebook-grade-col">Initial<br />weighted score</th></tr></thead>
            <tbody>
              {visibleStudents.map((student) => {
                const grade = computedGrades.find((row) => row.studentId === student.id)?.value ?? null;
                return <tr key={student.id}>
                  <th scope="row" className="scorebook-student-col"><span>{student.full_name}</span><small>{!weightsReady ? "Loading weights" : !weightsValid ? "Fix category weights" : grade === null ? "Incomplete" : grade >= 75 ? "At/above 75" : "Below 75"}</small></th>
                  {sortedAssessments.map((assessment) => {
                    const key = cellKey(assessment.id, student.id);
                    const value = scoreInputs[key] ?? "";
                    return <td key={assessment.id} data-label={`${CATEGORY_LABELS[assessment.category]}: ${assessment.assessment_name}`}><input aria-label={`${student.full_name}, ${assessment.assessment_name}, score out of ${assessment.max_score}`} type="number" inputMode="decimal" min="0" max={Number(assessment.max_score)} step="0.01" value={value} placeholder="—" onChange={(event) => handleScoreChange(assessment, student.id, event.target.value)} className={changedCells[key] ? "scorebook-cell-edited" : ""} /></td>;
                  })}
                  <td className="scorebook-grade-cell">{!weightsReady ? <span className="scorebook-incomplete">Loading</span> : !weightsValid ? <span className="scorebook-incomplete">Fix weights</span> : grade === null ? <span className="scorebook-incomplete">Incomplete</span> : <strong className={grade >= 75 ? "scorebook-pass" : "scorebook-fail"}>{grade.toFixed(2)}</strong>}</td>
                </tr>;
              })}
              {!visibleStudents.length && <tr><td colSpan={sortedAssessments.length + 2} className="scorebook-empty">No students match the current search.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      <div className="scorebook-mobile-view">
        {loading ? <div className="scorebook-empty"><span className="spinner" /> Loading assessments and scores…</div> : !students.length ? <div className="scorebook-empty"><strong>No students in this class yet.</strong><p>Students appear here after registering for this section.</p></div> : !sortedAssessments.length ? <div className="scorebook-empty"><strong>{activeSubject ? `No assessments for ${activeSubject}, Term ${activeTerm} yet.` : "Choose or create a saved subject first."}</strong><p>{activeSubject ? "Add an assessment column above to begin entering scores." : "Save a subject once; it will be available in the dropdown next time."}</p></div> : !visibleStudents.length ? <div className="scorebook-empty">No students match the current search.</div> : <>
          <section className="scorebook-mobile-assessment-list" aria-label="Manage assessment columns">
            <div className="scorebook-mobile-subheading"><div><span className="form-overline">ASSESSMENTS IN THIS TERM</span><h3>{activeSubject} · Term {activeTerm}</h3></div><span>{sortedAssessments.length} columns</span></div>
            {sortedAssessments.map((assessment) => <div className="scorebook-mobile-assessment" key={assessment.id}>
              <div><span className={`scorebook-category scorebook-${CATEGORY_ORDER.indexOf(assessment.category)}`}>{CATEGORY_LABELS[assessment.category]}</span><strong>{assessment.assessment_name}</strong><small>Highest score: {Number(assessment.max_score)}</small></div>
              <button type="button" onClick={() => void handleDeleteAssessment(assessment)} disabled={saving} aria-label={`Delete ${assessment.assessment_name}`}>Remove</button>
            </div>)}
          </section>
          <div className="scorebook-mobile-roster">
            {visibleStudents.map((student) => {
              const grade = computedGrades.find((row) => row.studentId === student.id)?.value ?? null;
              return <article className="scorebook-mobile-student-card" key={student.id}>
                <header><div><strong>{student.full_name}</strong><small>{!weightsReady ? "Loading weights" : !weightsValid ? "Fix category weights" : grade === null ? "Some scores still needed" : grade >= 75 ? "Initial score at/above 75" : "Initial score below 75"}</small></div><span className={!weightsReady || !weightsValid || grade === null ? "scorebook-incomplete" : grade >= 75 ? "scorebook-pass" : "scorebook-fail"}>{!weightsReady ? "Loading" : !weightsValid ? "Fix weights" : grade === null ? "Incomplete" : grade.toFixed(2)}</span></header>
                {sortedAssessments.map((assessment) => {
                  const key = cellKey(assessment.id, student.id);
                  const value = scoreInputs[key] ?? "";
                  return <label className="scorebook-mobile-score-field" key={assessment.id}>
                    <span><small>{CATEGORY_LABELS[assessment.category]}</small><strong>{assessment.assessment_name}</strong><em>Max {Number(assessment.max_score)}</em></span>
                    <input aria-label={`${student.full_name}, ${assessment.assessment_name}, score out of ${assessment.max_score}`} type="number" inputMode="decimal" min="0" max={Number(assessment.max_score)} step="0.01" value={value} placeholder="—" onChange={(event) => handleScoreChange(assessment, student.id, event.target.value)} className={changedCells[key] ? "scorebook-cell-edited" : ""} />
                  </label>;
                })}
              </article>;
            })}
          </div>
        </>}
      </div>

      <div className="scorebook-footer"><p>Blank cells mean “not entered”; a score of 0 is a real score. Initial weighted scores appear when every category above 0% has an assessment and all of that student’s scores in those categories are entered.</p><p>These are weighted initial scores, not official transmuted term grades. Configure the school-approved transmutation table and verify grading weights before using them for official reporting.</p></div>
      <div className="scorebook-tools"><label className="roster-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter students in scorebook" aria-label="Filter students in scorebook" /></label><span>Categories present: {CATEGORY_ORDER.map((item) => `${CATEGORY_LABELS[item]} ${categoriesPresent.has(item) ? "✓" : "—"}`).join(" · ")}</span></div>
    </section>
  );
}
