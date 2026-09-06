import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { getBuildPaths } from "@lucidcms/core/build";
import type {
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
	RuntimeAdaptConfig,
} from "@lucidcms/core/types";

/** Returns a config definition with runtime-specific setup. The original project configure callback still runs last. */
const adaptConfig: RuntimeAdaptConfig = (
	definition: LucidConfigDefinition,
	meta?: LucidConfigDefinitionMeta,
) => {
	return {
		...definition,
		configure: (draft) => {
			if (meta?.emailTemplates) {
				draft.email.templates = {
					...draft.email.templates,
					...Object.fromEntries(
						Object.entries(meta.emailTemplates).map(([key, value]) => [
							key,
							value.html,
						]),
					),
				};
			}
			// Astro owns and serves the hosted public asset pipeline.
			if (meta?.host === "astro") {
				definition.configure?.(draft);
				return;
			}

			draft.http.extensions.push({
				name: "runtime-node:static-assets",
				phase: "afterSetup",
				register: async (app, config) => {
					const paths = getBuildPaths(config);
					app.use(
						"/*",
						serveStatic({
							rewriteRequestPath: (path) => {
								const relativeClientDist = relative(
									process.cwd(),
									paths.publicDist,
								);
								return `${relativeClientDist}${path}`;
							},
						}),
					);
					app.get("/lucid", (c) => {
						const html = readFileSync(paths.spaDistHtml, "utf-8");
						return c.html(html);
					});
					app.get("/lucid/*", (c) => {
						const html = readFileSync(paths.spaDistHtml, "utf-8");
						return c.html(html);
					});
				},
			});
			definition.configure?.(draft);
		},
	};
};

export default adaptConfig;
