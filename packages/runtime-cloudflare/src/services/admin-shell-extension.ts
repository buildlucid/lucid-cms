import { shouldServeAdminShell } from "@lucidcms/core/runtime";
import type { EnvironmentVariables, HttpExtension } from "@lucidcms/core/types";
import constants from "../constants.js";

/** The Worker bindings the admin shell reads, alongside the project's. */
type WorkerEnv = EnvironmentVariables & {
	[constants.ASSETS_BINDING]: {
		fetch(request: Request): Promise<Response>;
	};
};

/** Serves the admin's index page from Workers static assets for client-side routes. */
const adminShellExtension: HttpExtension = {
	name: "runtime-cloudflare:spa-shell",
	phase: "afterSetup",
	register: (app) => {
		app.get("/admin/*", async (c, next) => {
			if (!shouldServeAdminShell(c.req.path, c.req.method)) return next();

			const url = new URL(c.req.url);
			const assets = (c.env as WorkerEnv)[constants.ASSETS_BINDING];
			const indexAsset = await assets.fetch(
				new Request(`${url.origin}/admin/index.html`),
			);

			return new Response(indexAsset.body, {
				status: indexAsset.status,
				headers: indexAsset.headers,
			});
		});
	},
};

export default adminShellExtension;
