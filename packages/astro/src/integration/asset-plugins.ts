import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { lookup as lookupMimeType } from "mime-types";
import type { Plugin } from "vite";
import astroConstants from "../constants.js";
import { toPosixPath } from "../internal/paths.js";
import { collectFiles, pathExists } from "./filesystem.js";

/**
 * Astro's dev server does not know about Lucid's generated asset tree, so this
 * middleware lets `/lucid/*` resolve without asking the user to run a second server.
 */
export const createLucidDevAssetPlugin = (assetRoot: string): Plugin => ({
	name: astroConstants.integration.devAssetPluginName,
	apply: "serve",
	configureServer(server) {
		server.middlewares.use(async (req, res, next) => {
			if (!req.url) {
				next();
				return;
			}

			const pathname = decodeURIComponent(
				new URL(req.url, astroConstants.http.devOrigin).pathname,
			);
			if (!pathname.startsWith(`${astroConstants.paths.mountPath}/`)) {
				next();
				return;
			}

			const filePath = path.join(assetRoot, pathname.replace(/^\/+/, ""));
			if (!toPosixPath(filePath).startsWith(toPosixPath(assetRoot))) {
				next();
				return;
			}

			try {
				const stats = await fs.stat(filePath);
				if (!stats.isFile()) {
					next();
					return;
				}
			} catch {
				next();
				return;
			}

			res.statusCode = astroConstants.http.okStatus;
			res.setHeader(
				astroConstants.http.contentTypeHeader,
				lookupMimeType(filePath) ||
					astroConstants.http.defaultBinaryContentType,
			);
			createReadStream(filePath).pipe(res);
		});
	},
});

/**
 * Astro only emits files it owns, so this plugin mirrors Lucid's prepared
 * assets into the build graph without introducing a second bundling step.
 */
export const createLucidBuildAssetPlugin = (assetRoot: string): Plugin => ({
	name: astroConstants.integration.buildAssetPluginName,
	async generateBundle() {
		if (!(await pathExists(assetRoot))) {
			return;
		}

		const files = await collectFiles(assetRoot);
		for (const filePath of files) {
			const source = await fs.readFile(filePath);
			this.emitFile({
				type: "asset",
				fileName: toPosixPath(path.relative(assetRoot, filePath)),
				source,
			});
		}
	},
});
