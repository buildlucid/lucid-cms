import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { getBuildPaths } from "@lucidcms/core/build";
import type {
	LucidConfig,
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
	RuntimeDefineConfig,
} from "@lucidcms/core/types";

const defineConfig: RuntimeDefineConfig = <AdapterFrom extends string>(
	definition: LucidConfigDefinition<AdapterFrom>,
	_meta?: LucidConfigDefinitionMeta,
): LucidConfigDefinition<AdapterFrom> => {
	return {
		...definition,
		config: (env) => {
			const lucidConfig = definition.config(env);
			return {
				...lucidConfig,
				hono: {
					routes: [
						...(lucidConfig.hono?.routes || []),
						async (app, config) => {
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
					],
				},
			} satisfies LucidConfig;
		},
	};
};

export default defineConfig;
