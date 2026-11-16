// Arazzo version detection (merged from arazzo-vscode/src/arazzo-detection.ts).

/** Versions published by the OAI and known by this package. */
export const KNOWN_ARAZZO_VERSIONS = ['1.0.0', '1.0.1', '1.1.0'] as const;

/** `major.minor` feature sets supported by the validator (one JSON Schema each). */
export type ArazzoMinor = '1.0' | '1.1';

/** Latest published version, used for migrations. */
export const LATEST_ARAZZO_VERSION = '1.1.0';

const VERSION_RE = /^(\d+)\.(\d+)\.(\d+)(-.+)?$/;

/** True when `root` is an object with an `arazzo` key (Arazzo document heuristic used by the editors). */
export function isArazzoDocument(root: unknown): boolean {
  return typeof root === 'object' && root !== null && !Array.isArray(root) && 'arazzo' in root;
}

/** The `arazzo` field as a string (numbers are stringified), or `null`. */
export function getArazzoVersion(root: unknown): string | null {
  if (!isArazzoDocument(root)) return null;
  const v = (root as Record<string, unknown>).arazzo;
  if (v === undefined || v === null) return null;
  return String(v);
}

/** `major.minor` of a well-formed version string (`1.1.0` → `1.1`), or `null`. */
export function getArazzoMinor(version: string | null | undefined): string | null {
  if (!version) return null;
  const m = VERSION_RE.exec(version);
  return m ? `${m[1]}.${m[2]}` : null;
}

/** The supported feature set for a version (`1.0.x` → `1.0`, `1.1.x` → `1.1`), or `null`. */
export function getSupportedMinor(version: string | null | undefined): ArazzoMinor | null {
  const minor = getArazzoMinor(version);
  return minor === '1.0' || minor === '1.1' ? minor : null;
}

/**
 * True for any `1.0.x` / `1.1.x` version (patch releases and pre-release
 * suffixes included, as accepted by the official schemas).
 */
export function isKnownArazzoVersion(version: string): boolean {
  return getSupportedMinor(version) !== null;
}

/** True when the version string has the `major.minor.patch` form. */
export function isWellFormedArazzoVersion(version: string): boolean {
  return VERSION_RE.test(version);
}
