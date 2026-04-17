import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { getBuildPaths } from "@lucidcms/core/build";
import type {
	LucidConfig,
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
	RuntimeConfigureLucid,
} from "@lucidcms/core/types";
import { produce } from "immer";

const configureLucid: RuntimeConfigureLucid = <AdapterFrom extends string>(
	definition: LucidConfigDefinition<AdapterFrom>,
	_meta?: LucidConfigDefinitionMeta,
): LucidConfigDefinition<AdapterFrom> => {
	return produce(definition, (draft) => {
		draft.config = (env) => {
			const lucidConfig = definition.config(env);

			return produce(lucidConfig, (lucidDraft) => {
				lucidDraft.hono ??= {};
				lucidDraft.hono.routes ??= [];
				lucidDraft.hono.routes.push(async (app, config) => {
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
			}) satisfies LucidConfig;
		};
	});
};

export default configureLucid;
