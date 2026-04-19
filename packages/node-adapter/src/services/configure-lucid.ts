import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { getBuildPaths } from "@lucidcms/core/build";
import type {
	LucidConfigDefinitionMeta,
	RuntimeConfigureLucid,
	WrappedLucidConfigDefinition,
} from "@lucidcms/core/types";

const configureLucid: RuntimeConfigureLucid = <
	AdapterModule extends string,
	DatabaseModule extends string,
>(
	definition: WrappedLucidConfigDefinition<AdapterModule, DatabaseModule>,
	_meta?: LucidConfigDefinitionMeta,
) => {
	return {
		...definition,
		recipe: (draft) => {
			definition.recipe?.(draft);
			draft.hono.routes.push(async (app, config) => {
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
			});
		},
	};
};

export default configureLucid;
