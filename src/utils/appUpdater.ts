export const APP_VERSION = '1.2.0';

export interface VersionManifest {
  version: string;
  releasedAt?: string;
  notes?: string;
  downloadUrl?: string;
}

export function normalizeSemver(raw: string): [number, number, number] | null {
  const cleaned = raw.trim().replace(/^v/i, '').split('-')[0];
  if (!/^\d+(\.\d+){0,2}$/.test(cleaned)) {
    return null;
  }
  const parts = cleaned.split('.').map((n) => Number(n));
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

export function compareSemver(a: string, b: string): number {
  const va = normalizeSemver(a);
  const vb = normalizeSemver(b);
  if (!va || !vb) return 0;

  for (let i = 0; i < 3; i++) {
    if (va[i] > vb[i]) return 1;
    if (va[i] < vb[i]) return -1;
  }
  return 0;
}

export function parseVersionManifest(raw: unknown): VersionManifest | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.version !== 'string' || !normalizeSemver(obj.version)) {
    return null;
  }
  return {
    version: obj.version.trim().replace(/^v/i, ''),
    releasedAt: typeof obj.releasedAt === 'string' ? obj.releasedAt : undefined,
    notes: typeof obj.notes === 'string' ? obj.notes : undefined,
    downloadUrl: typeof obj.downloadUrl === 'string' ? obj.downloadUrl : undefined,
  };
}
