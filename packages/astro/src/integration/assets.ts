import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { LucidError } from "@lucidcms/core";
import {
	prepareLucidPublicAssets,
	prepareLucidSPA,
} from "@lucidcms/core/build";
import { createTranslator } from "@lucidcms/core/plugin";
import { lookup as lookupMimeType } from "mime-types";
import type { Plugin } from "vite";
import constants from "../constants.js";
import { collectFiles, ensureDirectory, pathExists } from "./filesystem.js";
import type { ResolvedLucidProject } from "./project.js";

/** Prepares the Lucid public assets and admin application for Astro. */
export const prepareAssets = async (
	project: ResolvedLucidProject,
	assetRoot: string,
) => {
	await fs.rm(assetRoot, { recursive: true, force: true });
	await ensureDirectory(assetRoot);
	const translate = createTranslator({
		store: project.loaded.translationStore,
		locale: "en",
	});
	const publicResult = await prepareLucidPublicAssets({
		config: project.loaded.config,
		outDir: assetRoot,
		projectRoot: project.loaded.projectRoot,
		includeProjectPublic: false,
		silent: true,
	});

	if (publicResult.error) {
		throw new LucidError({
			message:
				translate.english(publicResult.error.message) ??
				"Lucid could not prepare its Astro public assets.",
		});
	}

	const spaResult = await prepareLucidSPA({
		outDir: path.join(assetRoot, constants.mountPath.slice(1)),
	});

	if (spaResult.error) {
		throw new LucidError({
			message:
				translate.english(spaResult.error.message) ??
				"Lucid could not prepare its Astro admin assets.",
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
			if (!pathname.startsWith(`${constants.mountPath}/`)) return next();

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
	const clientDirectory = path.join(buildDirectory, "client");
	const outputDirectory = (await pathExists(clientDirectory))
		? clientDirectory
		: buildDirectory;

	await Promise.all(
		(await collectFiles(assetRoot)).map(async (filePath) => {
			const outputPath = path.join(
				outputDirectory,
				path.relative(assetRoot, filePath),
			);
			await ensureDirectory(path.dirname(outputPath));
			await fs.copyFile(filePath, outputPath);
		}),
	);
};
