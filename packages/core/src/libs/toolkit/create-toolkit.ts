import createAuthToolkit from "./auth/index.js";
import createDocumentsToolkit from "./documents/index.js";
import createEmailToolkit from "./email/index.js";
import createLocalesToolkit from "./locales/index.js";
import createMediaToolkit from "./media/index.js";
import createPreviewsToolkit from "./previews/index.js";
import type { Toolkit, ToolkitContext } from "./types.js";

/**
 * Creates a server-side toolkit for reading Lucid data.
 *
 * Use this in server code when you want a small, read-focused API for Lucid
 * content, locales, media, and external email sends.
 *
 * For client-side data fetching, use the Lucid SDK instead.
 *
 * When Lucid needs to build absolute URLs, it uses `config.host`, then
 * `request.url`, and finally falls back to the local Lucid URL.
 *
 * Each toolkit method returns Lucid's standard `{ error, data }` response shape.
 *
 * @example
 * ```ts
 * const toolkit = createToolkit(serviceContext);
 *
 * await toolkit.documents.getMultiple({
 *   collectionKey: "page",
 *   query: {
 *     perPage: 20,
 *   },
 * });
 * ```
 */
const createToolkit = (context: ToolkitContext): Toolkit => ({
	auth: createAuthToolkit(context),
	documents: createDocumentsToolkit(context),
	email: createEmailToolkit(context),
	locales: createLocalesToolkit(context),
	media: createMediaToolkit(context),
	previews: createPreviewsToolkit(context),
});

export default createToolkit;
