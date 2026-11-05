import { readFile } from "node:fs/promises";
import path from "node:path";
import { previewScripts } from "@lucidcms/client/contract";
import type { Plugin } from "vite";
import { adminRoot } from "../config.js";

/** The scripts sites load from the CMS, built ahead of time as they run on sites rather than in the admin. */
const scripts = [
	{
		path: previewScripts.page.path,
		file: path.join(adminRoot, "dist/preview/page.iife.js"),
	},
	{
		path: previewScripts.toolbar.path,
		file: path.join(adminRoot, "dist/preview/toolbar.iife.js"),
	},
];

/** Serves the preview page and toolbar scripts during development and emits them into client builds. */
const adminPreviewPlugin = (): Plugin => ({
	name: "lucid:admin-preview",
	applyToEnvironment: (environment) => environment.name === "client",
	configureServer(server) {
		for (const script of scripts) {
			server.middlewares.use(script.path, (request, response, next) => {
				if (request.method !== "GET" && request.method !== "HEAD") {
					return next();
				}
				readFile(script.file)
					.then((source) => {
						response.setHeader(
							"Content-Type",
							"text/javascript; charset=utf-8",
						);
						response.setHeader("Cache-Control", "no-cache");
						response.end(request.method === "HEAD" ? undefined : source);
					})
					.catch(next);
			});
		}
	},
	async generateBundle() {
		for (const script of scripts) {
			this.emitFile({
				type: "asset",
				fileName: script.path.slice(1),
				source: await readFile(script.file),
			});
		}
	},
});

export default adminPreviewPlugin;
