import { createToolkitServiceContext } from "./config.js";
import createDocumentsToolkit from "./documents/index.js";
import createLocalesToolkit from "./locales/index.js";
import createMediaToolkit from "./media/index.js";
import type { CreateToolkitOptions, Toolkit } from "./types.js";

/**
 * Creates a server-side toolkit for reading content, locales, and media from Lucid.
 *
 * This is intended for server environments that can load your Lucid config directly.
 * For client-side data fetching, or runtimes that do not support Node.js modules such
 * as `fs`, the Lucid SDK is the better fit.
 *
 * When Lucid needs to build absolute URLs, it uses `options.requestUrl` first, then
 * `config.baseUrl`, and finally falls back to `http://localhost:6543`.
 *
 * Each toolkit method returns Lucid's standard `{ error, data }` response shape.
 *
 * @example
 * ```ts
 * const toolkit = await createToolkit();
 *
 * await toolkit.documents.getMultiple({
 *   collectionKey: "page",
 *   query: {
 *     perPage: 20,
 *   },
 * });
 * ```
 */
const createToolkit = async (
	options?: CreateToolkitOptions,
): Promise<Toolkit> => {
	const context = await createToolkitServiceContext(options);

	return {
		documents: createDocumentsToolkit(context),
		locales: createLocalesToolkit(context),
		media: createMediaToolkit(context),
	};
};

export default createToolkit;
