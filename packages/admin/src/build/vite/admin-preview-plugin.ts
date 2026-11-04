import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";
import { adminRoot } from "../config.js";

/** Where the admin serves the preview page script, which `@lucidcms/client`'s `setupPreview` loads into the builder's preview frame. */
export const previewScriptPath = "/admin/preview.js";

/** The page script, built ahead of time as it runs on sites rather than in the admin. */
const previewScriptFile = path.join(adminRoot, "dist/preview/page.iife.js");

/** Serves the preview page script during development and emits it into client builds. */
const adminPreviewPlugin = (): Plugin => ({
	name: "lucid:admin-preview",
	applyToEnvironment: (environment) => environment.name === "client",
	configureServer(server) {
		server.middlewares.use(previewScriptPath, (request, response, next) => {
			if (request.method !== "GET" && request.method !== "HEAD") {
				return next();
			}
			readFile(previewScriptFile)
				.then((source) => {
					response.setHeader("Content-Type", "text/javascript; charset=utf-8");
					response.setHeader("Cache-Control", "no-cache");
					response.end(request.method === "HEAD" ? undefined : source);
				})
				.catch(next);
		});
	},
	async generateBundle() {
		this.emitFile({
			type: "asset",
			fileName: previewScriptPath.slice(1),
			source: await readFile(previewScriptFile),
		});
	},
});

export default adminPreviewPlugin;
