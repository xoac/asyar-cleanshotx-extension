// Pure URL building for the CleanShot X URL scheme. No SDK imports so it is unit-testable.
// Raycast reference: docs/research/raycast-cleanshotx.md (section "Port plan").

/** Values accepted by the optional `action` query parameter (fixed enum, as in the Raycast extension). */
export const CAPTURE_ACTIONS = ['copy', 'save', 'annotate', 'upload', 'pin'] as const;
export type CaptureAction = (typeof CAPTURE_ACTIONS)[number];

export interface CleanShotRoute {
  /** URL path after `cleanshot://`. */
  path: string;
  /** Whether the command accepts the optional `action` argument. */
  action: boolean;
}

/** Manifest command id -> CleanShot X URL route. Every background command in manifest.json must be listed. */
export const ROUTES: Readonly<Record<string, CleanShotRoute>> = {
  'capture-area': { path: 'capture-area', action: true },
  'capture-fullscreen': { path: 'capture-fullscreen', action: true },
  'capture-window': { path: 'capture-window', action: true },
  'capture-previous-area': { path: 'capture-previous-area', action: true },
  'self-timer': { path: 'self-timer', action: true },
  'record-screen': { path: 'record-screen', action: false },
  'open-history': { path: 'open-history', action: false },
  'scrolling-capture': { path: 'scrolling-capture', action: false },
  'all-in-one': { path: 'all-in-one', action: false },
  'capture-text': { path: 'capture-text', action: false },
  'open-from-clipboard': { path: 'open-from-clipboard', action: false },
  'toggle-desktop-icons': { path: 'toggle-desktop-icons', action: false },
  'hide-desktop-icons': { path: 'hide-desktop-icons', action: false },
  'show-desktop-icons': { path: 'show-desktop-icons', action: false },
  'restore-recently-closed': { path: 'restore-recently-closed', action: false },
};

/**
 * Build `cleanshot://<path>[?k=v&...]`. Values are percent-encoded with `encodeURIComponent`
 * (a no-op for the fixed `action` enum; correct for file paths later). `URLSearchParams` is avoided
 * on purpose: it encodes spaces as `+`, which CleanShot X may not decode.
 */
export function buildUrl(path: string, params?: Record<string, string>): string {
  const query = Object.entries(params ?? {})
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `cleanshot://${path}${query ? `?${query}` : ''}`;
}

/** Narrow an untyped argument value; absent, empty or unknown values mean "no action". */
export function parseAction(value: unknown): CaptureAction | undefined {
  return typeof value === 'string' && (CAPTURE_ACTIONS as readonly string[]).includes(value)
    ? (value as CaptureAction)
    : undefined;
}

/** URL for a manifest command id plus the raw `args.arguments` bag, or `undefined` for an unknown command. */
export function urlForCommand(commandId: string, args?: Record<string, unknown>): string | undefined {
  // Own keys only: a plain lookup would match prototype keys such as `toString` or `__proto__`.
  if (!Object.hasOwn(ROUTES, commandId)) return undefined;
  const route = ROUTES[commandId];
  const action = route.action ? parseAction(args?.action) : undefined;
  return buildUrl(route.path, action ? { action } : undefined);
}
