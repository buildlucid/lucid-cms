import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { getBuildPaths } from "@lucidcms/core/build";
import type {
	LucidConfigDefinitionMeta,
	RuntimeConfigureLucid,
	WrappedLucidConfigDefinition,
} from "@lucidcms/core/types";

const configureLucid: RuntimeConfigureLucid = (
	definition: WrappedLucidConfigDefinition,
	meta?: LucidConfigDefinitionMeta,
) => {
	return {
		...definition,
		recipe: (draft) => {
			definition.recipe?.(draft);
			// Astro owns and serves the hosted public asset pipeline.
			if (meta?.host === "astro") return;

			draft.http.extensions.push({
				name: "runtime-node:static-assets",
				priority: 2,
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
		},
	};
};

export default configureLucid;
