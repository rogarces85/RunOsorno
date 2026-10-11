export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

const INITIALS_COLORS = [
  "#206bc4",
  "#f59f00",
  "#37b24d",
  "#e03131",
  "#7048e8",
  "#1098ad",
];

export function initialsColor(name: string): string {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % INITIALS_COLORS.length;
  }
  return INITIALS_COLORS[hash] ?? "#206bc4";
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function svgAvatar(name: string): string {
  const initials = escapeXml(initialsFor(name));
  const color = initialsColor(name);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="${color}"/><text x="64" y="64" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif" font-size="48" font-weight="600" fill="#ffffff">${initials}</text></svg>`;
}
