export function schoolPath(slug: string | undefined, path = "") {
  if (!slug) return path || "/";
  const suffix = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `/s/${encodeURIComponent(slug)}${suffix}`;
}
