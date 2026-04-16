import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { lookup as lookupMimeType } from "mime-types";
import type { Plugin } from "vite";
import {
	ASTRO_DEV_ORIGIN,
	CONTENT_TYPE_HEADER,
	DEFAULT_BINARY_CONTENT_TYPE,
	HTTP_STATUS_OK,
	LUCID_ASTRO_BUILD_ASSET_PLUGIN_NAME,
	LUCID_ASTRO_DEV_ASSET_PLUGIN_NAME,
	LUCID_MOUNT_PATH,
} from "../constants.js";
import { toPosixPath } from "../internal/paths.js";
import { collectFiles, pathExists } from "./filesystem.js";

/**
 * Astro's dev server does not know about Lucid's generated asset tree, so this
 * middleware lets `/lucid/*` resolve without asking the user to run a second server.
 */
export const createLucidDevAssetPlugin = (assetRoot: string): Plugin => ({
	name: LUCID_ASTRO_DEV_ASSET_PLUGIN_NAME,
	apply: "serve",
	configureServer(server) {
		server.middlewares.use(async (req, res, next) => {
			if (!req.url) {
				next();
				return;
			}

			const pathname = decodeURIComponent(
				new URL(req.url, ASTRO_DEV_ORIGIN).pathname,
			);
			if (!pathname.startsWith(`${LUCID_MOUNT_PATH}/`)) {
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

			res.statusCode = HTTP_STATUS_OK;
			res.setHeader(
				CONTENT_TYPE_HEADER,
				lookupMimeType(filePath) || DEFAULT_BINARY_CONTENT_TYPE,
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
	name: LUCID_ASTRO_BUILD_ASSET_PLUGIN_NAME,
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
