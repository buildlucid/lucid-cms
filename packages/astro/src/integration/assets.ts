import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { createTranslator, LucidError } from "@lucidcms/core";
import { prepareLucidPublicAssets } from "@lucidcms/core/build";
import { lookup as lookupMimeType } from "mime-types";
import type { Plugin } from "vite";
import constants from "../constants.js";
import { collectFiles, ensureDirectory, pathExists } from "./filesystem.js";
import type { ResolvedLucidProject } from "./project.js";

/** Prepares Lucid public resources that Astro does not already serve. */
export const prepareAssets = async (
	project: ResolvedLucidProject,
	assetRoot: string,
	astroPublicDirectory: string,
) => {
	await fs.rm(assetRoot, { recursive: true, force: true });
	await ensureDirectory(assetRoot);
	const translate = createTranslator({
		store: project.loaded.translationStore,
		locale: "en",
	});
	const publicResult = await prepareLucidPublicAssets({
		// Astro already serves files at their original paths in its public directory.
		files: project.loaded.resources.files.public.filter(
			(file) => file.path !== path.resolve(astroPublicDirectory, file.name),
		),
		outDir: assetRoot,
		projectRoot: project.loaded.projectRoot,
		silent: true,
	});

	if (publicResult.error) {
		throw new LucidError({
			message:
				translate.english(publicResult.error.message) ??
				"Lucid could not prepare its Astro public assets.",
		});
	}
};

/** Serves generated Lucid assets through Astro's development server. */
export const createDevAssetPlugin = (assetRoot: string): Plugin => ({
	name: `${constants.integrationName}:assets-dev`,
	apply: "serve",
	configureServer(server) {
		server.middlewares.use(async (request, response, next) => {
			if (!request.url) return next();
			const pathname = decodeURIComponent(
				new URL(request.url, "http://astro.local").pathname,
			);

			const filePath = path.resolve(assetRoot, pathname.slice(1));
			const relativePath = path.relative(assetRoot, filePath);
			if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
				return next();
			}

			try {
				if (!(await fs.stat(filePath)).isFile()) return next();
			} catch {
				return next();
			}

			response.statusCode = 200;
			response.setHeader(
				"Content-Type",
				lookupMimeType(filePath) || "application/octet-stream",
			);
			createReadStream(filePath).pipe(response);
		});
	},
});

/** Copies generated Lucid assets into Astro's completed build. */
export const copyAssets = async (assetRoot: string, buildDirectory: string) => {
	if (!(await pathExists(assetRoot))) return;

	await Promise.all(
		(await collectFiles(assetRoot)).map(async (filePath) => {
			const outputPath = path.join(
				buildDirectory,
				path.relative(assetRoot, filePath),
			);
			await ensureDirectory(path.dirname(outputPath));
			await fs.copyFile(filePath, outputPath);
		}),
	);
};
