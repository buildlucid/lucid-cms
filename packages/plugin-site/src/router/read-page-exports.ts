import { LucidError, logger } from "@lucidcms/core";
import { PLUGIN_KEY } from "../constants.js";
import type { SiteKiln } from "../site/create-site-kiln.js";

/** Page export settings, with `mode` and `revalidate` read as literals without executing the template. */
export type PageExports = {
	mode?: "ssr" | "isr";
	revalidate?: number;
	paths: boolean;
};

const readPageExports = async (
	kiln: SiteKiln,
	template: string,
): Promise<PageExports> => {
	const settings: PageExports = { paths: false };
	for (const entry of (await kiln.analyze(template)).exports) {
		switch (entry.name) {
			case "paths":
				settings.paths = true;
				break;
			case "mode":
				if (entry.value !== "ssr" && entry.value !== "isr") {
					throw new LucidError({
						scope: PLUGIN_KEY,
						message: `'${template}' must export mode as the literal "ssr" or "isr".`,
					});
				}
				settings.mode = entry.value;
				break;
			case "revalidate":
				if (typeof entry.value !== "number" || !(entry.value > 0)) {
					throw new LucidError({
						scope: PLUGIN_KEY,
						message: `'${template}' must export revalidate as a literal number of seconds above 0.`,
					});
				}
				settings.revalidate = entry.value;
				break;
			default:
				logger.warn({
					scope: PLUGIN_KEY,
					event: "plugin-site.page.unknown-export",
					dedupeKey: `${PLUGIN_KEY}:unknown-export:${template}:${entry.name}`,
					message: `'${template}' exports '${entry.name}', which the site plugin doesn't use. Pages can export paths, mode and revalidate.`,
				});
		}
	}
	return settings;
};

export default readPageExports;
