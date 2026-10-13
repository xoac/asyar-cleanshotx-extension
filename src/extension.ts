// Extension implementation for CleanShot X, free of boot side effects so it can be unit-tested.
// Each background command resolves to a cleanshot:// URL (see ./cleanshot) which is opened once
// the launcher has had time to hide. worker.ts wires this into the SDK bridge.
import type {
  Extension,
  ExtensionContext,
  IFeedbackService,
  ILogService,
  IOpenerService,
} from 'asyar-sdk/contracts';

import { urlForCommand } from './cleanshot';

/**
 * Pause between receiving a background command and opening the URL. The host hides the launcher
 * right after dispatching a command with no ack, and the pause keeps the launcher out of the
 * screenshot. UNVERIFIED value: tune on a real build.
 */
export const LAUNCHER_HIDE_DELAY_MS = 150;

/** How long a command waits for `initialize` before it is dropped. */
export const INIT_WAIT_MS = 2000;

export const OPEN_FAILED_HUD = 'CleanShot X: could not open cleanshot:// (is CleanShot X installed?)';

const pause = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

interface Services {
  log: ILogService;
  feedback: IFeedbackService;
  opener: IOpenerService;
}

/**
 * Deep links deliver query params flat (`args.action` plus `deeplinkTrigger: true`), while search
 * and hotkey invocations nest them under `args.arguments`. Normalize both into one bag.
 * Evidence: tmp/asyar/asyar-launcher/src/services/deeplink/deeplinkService.svelte.ts and
 * docs/reference/deeplink-triggering.md.
 */
export function extractArguments(args?: Record<string, unknown>): Record<string, unknown> | undefined {
  return (args?.arguments as Record<string, unknown> | undefined) ?? (args?.deeplinkTrigger ? args : undefined);
}

export function createExtension(): Extension {
  let services: Services | undefined;
  let markReady: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    markReady = resolve;
  });

  async function openAfterDelay(svc: Services, url: string): Promise<void> {
    await pause(LAUNCHER_HIDE_DELAY_MS);
    try {
      await svc.opener.openUrl(url);
    } catch (err) {
      svc.log.error(`CleanShot X: could not open ${url}: ${String(err)}`);
      // The launcher is hidden by now, so surface the failure as a HUD.
      await svc.feedback.showHUD(OPEN_FAILED_HUD);
    }
  }

  return {
    async initialize(ctx: ExtensionContext) {
      services = {
        log: ctx.getService<ILogService>('log'),
        feedback: ctx.getService<IFeedbackService>('feedback'),
        opener: ctx.getService<IOpenerService>('opener'),
      };
      markReady();
    },
    async activate() {},
    async deactivate() {},
    async executeCommand(commandId, args) {
      // A command can race with initialize; wait briefly instead of silently dropping it.
      if (!services) await Promise.race([ready, pause(INIT_WAIT_MS)]);
      if (!services) {
        // No services means no log/HUD either, so console is the only channel left.
        console.error(`CleanShot X: command "${commandId}" dropped, extension not initialized`);
        return undefined;
      }
      const url = urlForCommand(commandId, extractArguments(args));
      if (url === undefined) {
        services.log.warn(`CleanShot X: no route for command "${commandId}"`);
        return undefined;
      }
      await openAfterDelay(services, url);
      return undefined;
    },
    onUnload() {},
  };
}
