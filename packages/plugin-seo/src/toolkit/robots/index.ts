import { runToolkitService } from "@lucidcms/core/toolkit";
import type { ToolkitContext } from "@lucidcms/core/types";
import { robotsReadInputSchema } from "../../schema/robots.js";
import type { SeoPluginOptionsInternal } from "../../services/parse-plugin-options.js";
import getRobots from "../../services/robots/get-robots.js";
import type { RobotsReadInput } from "../../types.js";

/** robots.txt for `toolkit.seo.robots`, which the content API and root route also use. */
const createRobotsToolkit = (
	context: ToolkitContext,
	options: SeoPluginOptionsInternal,
) => ({
	/**
	 * Writes robots.txt for a site origin, the default locale's unless `origin` names another.
	 *
	 * @example
	 * ```ts
	 * const robots = await toolkit.seo.robots.text({ origin: "https://example.fr" });
	 * ```
	 */
	text: (input: RobotsReadInput = {}) =>
		runToolkitService({
			schema: robotsReadInputSchema,
			input,
			handler: (read) => getRobots(context, { options, input: read }),
			name: { key: "plugin.seo.toolkit.robots.error.name" },
			message: { key: "plugin.seo.toolkit.robots.error.message" },
		}),
});

export default createRobotsToolkit;
