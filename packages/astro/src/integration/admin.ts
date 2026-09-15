import { createAdminDevServer } from "@lucidcms/core/build";
import { isAdminPath, shouldServeAdminShell } from "@lucidcms/core/runtime";
import type { Plugin } from "vite";

/** Shares Astro's listener while keeping the admin's compiler settings separate. */
export const createDevAdminPlugin = (projectRoot: string): Plugin => {
	let admin: Awaited<ReturnType<typeof createAdminDevServer>> | undefined;
	return {
		name: "lucid:admin-dev",
		apply: "serve",
		async configureServer(server) {
			if (!server.httpServer) {
				throw new Error("Lucid admin requires Astro's HTTP server.");
			}

			admin = await createAdminDevServer({
				projectRoot,
				server: server.httpServer,
			});
			const currentAdmin = admin;

			server.middlewares.use((request, response, next) => {
				const pathname = new URL(request.url ?? "/", "http://astro.local")
					.pathname;

				if (!isAdminPath(pathname)) return next();

				if (!shouldServeAdminShell(pathname, request.method ?? "GET")) {
					return currentAdmin.middleware(request, response, next);
				}

				void currentAdmin
					.renderHtml(request.url ?? pathname)
					.then((html) => {
						response.setHeader("Content-Type", "text/html; charset=utf-8");
						response.setHeader("Cache-Control", "no-store");
						response.end(request.method === "HEAD" ? undefined : html);
					})
					.catch(next);
			});
		},
		async closeBundle() {
			await admin?.close();
			admin = undefined;
		},
	};
};
