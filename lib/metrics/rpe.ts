const RPE_TARGETS: Record<string, number> = {
  series: 8,
  intervalos: 8,
  intervalo: 8,
  tempo: 7,
  fondo: 6,
  largo: 6,
  recuperacion: 3,
  recovery: 3,
};

function normalizeType(sessionType: string): string {
  return sessionType
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function plannedRpeTarget(sessionType: string): number | null {
  const key = normalizeType(sessionType);
  return RPE_TARGETS[key] ?? null;
}

export function calcPlannedRpe(sessionTypes: string[]): number | null {
  const targets = sessionTypes
    .map(plannedRpeTarget)
    .filter((target): target is number => target !== null);
  if (targets.length === 0) {
    return null;
  }
  const sum = targets.reduce((acc, target) => acc + target, 0);
  return Math.round((sum / targets.length) * 10) / 10;
}
