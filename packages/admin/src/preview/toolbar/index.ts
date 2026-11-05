import { previewScripts } from "@lucidcms/client/contract";
import type { PreviewToolbarScript } from "@lucidcms/types";
import { setupToolbar } from "./toolbar.js";

/**
 * The toolbar script the CMS serves at `/admin/toolbar.js`. `setupPreview` from
 * `@lucidcms/client` loads it outside the builder's preview frame and starts it.
 */
const script: PreviewToolbarScript = { version: 1, setup: setupToolbar };
Object.defineProperty(window, previewScripts.toolbar.key, {
	value: script,
	configurable: true,
});
