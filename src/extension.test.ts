import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Extension, ExtensionContext } from 'asyar-sdk/contracts';
import {
  INIT_WAIT_MS,
  LAUNCHER_HIDE_DELAY_MS,
  OPEN_FAILED_HUD,
  createExtension,
  extractArguments,
} from './extension';

function makeServices() {
  return {
    log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
    feedback: { showHUD: vi.fn(async () => {}) },
    opener: { openUrl: vi.fn(async () => {}) },
  };
}

function makeContext(services: ReturnType<typeof makeServices>): ExtensionContext {
  return { getService: (name: string) => (services as Record<string, unknown>)[name] } as unknown as ExtensionContext;
}

async function boot(services = makeServices()) {
  const ext: Extension = createExtension();
  await ext.initialize(makeContext(services));
  return { ext, services };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('extractArguments', () => {
  it('prefers nested args.arguments', () => {
    expect(extractArguments({ arguments: { action: 'copy' } })).toEqual({ action: 'copy' });
  });

  it('falls back to the flat bag only for deep links', () => {
    const flat = { action: 'save', deeplinkTrigger: true };
    expect(extractArguments(flat)).toBe(flat);
    expect(extractArguments({ action: 'save' })).toBeUndefined();
    expect(extractArguments(undefined)).toBeUndefined();
  });
});

describe('executeCommand', () => {
  it('reads action from nested args.arguments', async () => {
    const { ext, services } = await boot();
    const run = ext.executeCommand('capture-area', { arguments: { action: 'copy' } });
    await vi.advanceTimersByTimeAsync(LAUNCHER_HIDE_DELAY_MS);
    await run;
    expect(services.opener.openUrl).toHaveBeenCalledWith('cleanshot://capture-area?action=copy');
  });

  it('reads action from flat deep-link args', async () => {
    const { ext, services } = await boot();
    const run = ext.executeCommand('capture-area', { action: 'save', deeplinkTrigger: true });
    await vi.advanceTimersByTimeAsync(LAUNCHER_HIDE_DELAY_MS);
    await run;
    expect(services.opener.openUrl).toHaveBeenCalledWith('cleanshot://capture-area?action=save');
  });

  it('ignores flat args without the deeplink flag', async () => {
    const { ext, services } = await boot();
    const run = ext.executeCommand('capture-area', { action: 'save' });
    await vi.advanceTimersByTimeAsync(LAUNCHER_HIDE_DELAY_MS);
    await run;
    expect(services.opener.openUrl).toHaveBeenCalledWith('cleanshot://capture-area');
  });

  it('opens the URL only after the launcher hide delay', async () => {
    const { ext, services } = await boot();
    const run = ext.executeCommand('open-history', {});
    await vi.advanceTimersByTimeAsync(LAUNCHER_HIDE_DELAY_MS - 1);
    expect(services.opener.openUrl).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await run;
    expect(services.opener.openUrl).toHaveBeenCalledTimes(1);
    expect(services.opener.openUrl).toHaveBeenCalledWith('cleanshot://open-history');
  });

  it('logs and shows a HUD when opening fails', async () => {
    const services = makeServices();
    services.opener.openUrl.mockRejectedValue(new Error('denied'));
    const { ext } = await boot(services);
    const run = ext.executeCommand('open-history', {});
    await vi.advanceTimersByTimeAsync(LAUNCHER_HIDE_DELAY_MS);
    await expect(run).resolves.toBeUndefined();
    expect(services.log.error).toHaveBeenCalledWith(expect.stringContaining('cleanshot://open-history'));
    expect(services.log.error).toHaveBeenCalledWith(expect.stringContaining('denied'));
    expect(services.feedback.showHUD).toHaveBeenCalledWith(OPEN_FAILED_HUD);
    expect(OPEN_FAILED_HUD).toContain('is CleanShot X installed?');
  });

  it('warns and opens nothing for an unknown command', async () => {
    const { ext, services } = await boot();
    await expect(ext.executeCommand('toString', {})).resolves.toBeUndefined();
    expect(services.log.warn).toHaveBeenCalled();
    expect(services.opener.openUrl).not.toHaveBeenCalled();
  });

  it('waits for initialize when a command arrives early', async () => {
    const ext = createExtension();
    const services = makeServices();
    const run = ext.executeCommand('open-history', {});
    await vi.advanceTimersByTimeAsync(100);
    await ext.initialize(makeContext(services));
    await vi.advanceTimersByTimeAsync(LAUNCHER_HIDE_DELAY_MS);
    await run;
    expect(services.opener.openUrl).toHaveBeenCalledWith('cleanshot://open-history');
  });

  it('drops the command with a console error when never initialized', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ext = createExtension();
    const run = ext.executeCommand('open-history', {});
    await vi.advanceTimersByTimeAsync(INIT_WAIT_MS);
    await expect(run).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('not initialized'));
  });
});
