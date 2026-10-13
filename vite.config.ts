import { defineExtensionConfig } from 'asyar-sdk/vite';

// Worker-only extension: with no view.html present, the helper emits just dist/worker.js.
export default defineExtensionConfig({ root: import.meta.dirname });
