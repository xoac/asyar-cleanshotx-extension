// Headless worker entry for the CleanShot X extension: boots the SDK bridge only.
// The implementation lives in ./extension so it can be tested without boot side effects.
import { ExtensionContext as WorkerContext, extensionBridge } from 'asyar-sdk/worker';

import manifest from '../manifest.json';
import { createExtension } from './extension';

// Boot sequence required by the SDK: id, context, manifest + implementation, then initialize.
const id = manifest.id;
new WorkerContext().setExtensionId(id);
extensionBridge.registerManifest(manifest as never);
extensionBridge.registerExtensionImplementation(id, createExtension());
void extensionBridge.initializeExtensions();
