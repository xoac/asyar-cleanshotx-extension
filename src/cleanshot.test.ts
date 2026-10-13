import { describe, expect, it } from 'vitest';
import manifest from '../manifest.json';
import { CAPTURE_ACTIONS, ROUTES, buildUrl, parseAction, urlForCommand } from './cleanshot';

describe('buildUrl', () => {
  it('builds a bare scheme URL', () => {
    expect(buildUrl('open-history')).toBe('cleanshot://open-history');
    expect(buildUrl('record-screen', {})).toBe('cleanshot://record-screen');
  });

  it('appends query parameters', () => {
    expect(buildUrl('capture-area', { action: 'copy' })).toBe('cleanshot://capture-area?action=copy');
  });

  it('percent-encodes values exactly once (spaces as %20, not +)', () => {
    const filepath = '/Users/me/My Shots/a&b#1?é.png';
    const url = buildUrl('open-annotate', { filepath });
    expect(url).toBe(`cleanshot://open-annotate?filepath=${encodeURIComponent(filepath)}`);
    expect(url).not.toContain('+');
    expect(url.split('?')).toHaveLength(2);
    expect(url.split('&')).toHaveLength(1);
  });

  it('joins several parameters with &', () => {
    expect(buildUrl('x', { a: '1', b: '2' })).toBe('cleanshot://x?a=1&b=2');
  });
});

describe('parseAction', () => {
  it('passes every known action through unchanged', () => {
    for (const action of CAPTURE_ACTIONS) expect(parseAction(action)).toBe(action);
  });

  it('treats absent, empty and unknown values as no action', () => {
    for (const value of [undefined, null, '', 'COPY', 'delete', 1, {}]) {
      expect(parseAction(value)).toBeUndefined();
    }
  });
});

describe('urlForCommand', () => {
  it('adds action only for commands that accept it', () => {
    expect(urlForCommand('capture-area', { action: 'save' })).toBe('cleanshot://capture-area?action=save');
    expect(urlForCommand('capture-fullscreen', { action: 'pin' })).toBe('cleanshot://capture-fullscreen?action=pin');
    expect(urlForCommand('record-screen', { action: 'save' })).toBe('cleanshot://record-screen');
  });

  it('omits action when the optional argument is absent or empty', () => {
    expect(urlForCommand('capture-area')).toBe('cleanshot://capture-area');
    expect(urlForCommand('capture-area', {})).toBe('cleanshot://capture-area');
    expect(urlForCommand('capture-area', { action: '' })).toBe('cleanshot://capture-area');
  });

  it('returns undefined for unknown commands', () => {
    expect(urlForCommand('nope')).toBeUndefined();
  });

  it('does not match Object.prototype keys', () => {
    for (const id of ['toString', '__proto__', 'constructor', 'hasOwnProperty', 'valueOf']) {
      expect(urlForCommand(id)).toBeUndefined();
    }
  });
});

describe('every route', () => {
  const expected: Record<string, string> = {
    'capture-area': 'cleanshot://capture-area',
    'capture-fullscreen': 'cleanshot://capture-fullscreen',
    'capture-window': 'cleanshot://capture-window',
    'capture-previous-area': 'cleanshot://capture-previous-area',
    'self-timer': 'cleanshot://self-timer',
    'record-screen': 'cleanshot://record-screen',
    'open-history': 'cleanshot://open-history',
    'scrolling-capture': 'cleanshot://scrolling-capture',
    'all-in-one': 'cleanshot://all-in-one',
    'capture-text': 'cleanshot://capture-text',
    'open-from-clipboard': 'cleanshot://open-from-clipboard',
    'toggle-desktop-icons': 'cleanshot://toggle-desktop-icons',
    'hide-desktop-icons': 'cleanshot://hide-desktop-icons',
    'show-desktop-icons': 'cleanshot://show-desktop-icons',
    'restore-recently-closed': 'cleanshot://restore-recently-closed',
  };

  it('covers exactly 15 commands', () => {
    expect(Object.keys(expected)).toHaveLength(15);
    expect(Object.keys(ROUTES).sort()).toEqual(Object.keys(expected).sort());
  });

  it.each(Object.entries(expected))('%s -> %s', (id, url) => {
    expect(urlForCommand(id)).toBe(url);
  });
});

describe('manifest consistency', () => {
  it('has a route for every command and vice versa', () => {
    expect(manifest.commands.map((c) => c.id).sort()).toEqual(Object.keys(ROUTES).sort());
  });

  it('declares an action dropdown (seed none, optional) exactly on routes that take an action', () => {
    for (const command of manifest.commands) {
      const args = (command as { arguments?: { name: string; type: string; seed?: string; required?: boolean; data?: { value: string }[] }[] }).arguments;
      if (ROUTES[command.id].action) {
        expect(args).toHaveLength(1);
        expect(args![0]).toMatchObject({ name: 'action', type: 'dropdown', seed: 'none', required: false });
        expect(args![0].data!.map((d) => d.value)).toEqual([...CAPTURE_ACTIONS]);
      } else {
        expect(args).toBeUndefined();
      }
    }
  });

  it('requests only shell:open-url for the cleanshot scheme', () => {
    expect(manifest.permissions).toEqual(['shell:open-url']);
    expect(manifest.permissionArgs).toEqual({ 'shell:open-url': ['cleanshot'] });
  });
});
