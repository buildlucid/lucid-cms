import createAuthToolkit from "./auth/index.js";
import createCollectionsToolkit from "./collections/index.js";
import createDocumentsToolkit from "./documents/index.js";
import createEmailToolkit from "./email/index.js";
import createJobsToolkit from "./jobs/index.js";
import createLocalesToolkit from "./locales/index.js";
import createMediaToolkit from "./media/index.js";
import createPreviewsToolkit from "./previews/index.js";
import type { CoreToolkit, Toolkit, ToolkitContext } from "./types.js";

/**
 * Creates server-side helpers bound to a Lucid service context.
 *
 * Use this in server code to read Lucid content, work with media, enqueue jobs
 * and send external emails without calling internal services directly.
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
 *   version: "published",
 *   query: {
 *     perPage: 20,
 *   },
 * });
 * ```
 */
const createToolkit = (context: ToolkitContext): Toolkit => {
	const core: CoreToolkit = {
		auth: createAuthToolkit(context),
		collections: createCollectionsToolkit(context),
		documents: createDocumentsToolkit(context),
		email: createEmailToolkit(context),
		jobs: createJobsToolkit(context),
		locales: createLocalesToolkit(context),
		media: createMediaToolkit(context),
		previews: createPreviewsToolkit(context),
	};
	const toolkit: Toolkit = { ...core };

	for (const plugin of context.config.plugins) {
		if (!plugin.toolkit) continue;

		const service = plugin.toolkit.create({ context, core });
		if (
			service === null ||
			(typeof service !== "object" && typeof service !== "function") ||
			("then" in service && service.then !== undefined)
		) {
			throw new TypeError(
				`Toolkit service "${plugin.toolkit.key}" from plugin "${plugin.key}" must synchronously return a service object.`,
			);
		}

		Object.defineProperty(toolkit, plugin.toolkit.key, {
			configurable: true,
			enumerable: true,
			writable: true,
			value: service,
		});
	}

	return toolkit;
};

export default createToolkit;
