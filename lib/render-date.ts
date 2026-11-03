function manilaDateParts(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
}

export function getManilaDateString(date = new Date()) {
  const parts = manilaDateParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function getRenderDateSnapshot() {
  const now = new Date();
  const parts = manilaDateParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const startYear = month >= 6 ? year : year - 1;
  return {
    today: now.toISOString().slice(0, 10),
    localToday: getManilaDateString(now),
    year,
    academicYear: `${startYear}–${startYear + 1}`
  };
}
