import { getVitePaths } from "@lucidcms/core/helpers";
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import type {
	LucidAdapterDefineConfig,
	LucidConfig,
} from "@lucidcms/core/types";

const defineConfig = (
	factory: LucidAdapterDefineConfig,
): LucidAdapterDefineConfig => {
	return (env) => {
		const lucidConfig = factory(env);
		return {
			...lucidConfig,
			hono: {
				extensions: [
					...(lucidConfig.hono?.extensions || []),
					async (app, config) => {
						const paths = getVitePaths(config);
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
						app.get("/admin", (c) => {
							const html = readFileSync(paths.clientDistHtml, "utf-8");
							return c.html(html);
						});
						app.get("/admin/*", (c) => {
							const html = readFileSync(paths.clientDistHtml, "utf-8");
							return c.html(html);
						});
					},
				],
			},
		} satisfies LucidConfig;
	};
};

export default defineConfig;
