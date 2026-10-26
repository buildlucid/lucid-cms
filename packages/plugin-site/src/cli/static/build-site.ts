import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { LucidError } from "@lucidcms/core";
import {
	pluginDirectory,
	pluginPublicDirectory,
} from "@lucidcms/core/extension";
import type { LucidPluginCommand } from "@lucidcms/core/types";
import { createBuilder, type Plugin } from "vite";
import { PLUGIN_KEY } from "../../constants.js";
import type { RenderSiteTask } from "../../tasks/static-build/render-site.js";
import type { SitePluginOptionsInternal } from "../../types.js";
import limitDetails from "../../utils/limit-details.js";
import normalizePath from "../../utils/normalize-path.js";
import getSiteVitePluginApi from "../vite/get-site-vite-plugin-api.js";
import addReferencedFiles from "./add-referenced-files.js";
import assertOutputFolder from "./assert-output-folder.js";
import listSiteFiles from "./list-site-files.js";
import writeStaticFile from "./write-static-file.js";

type BuildProps = Parameters<LucidPluginCommand["run"]>[0];

/** Redirects client output to its own folder when allowed, preserving existing Worker assets if Cloudflare moves the output there after config resolution. */
const clientOutDir = (outDir: string): Plugin => ({
	name: "lucid:site-build-output",
	enforce: "post",
	configEnvironment: (name) =>
		name === "client" ? { build: { outDir, emptyOutDir: true } } : undefined,
	configResolved: (config) => {
		const client = config.environments.client;
		if (client && path.resolve(config.root, client.build.outDir) !== outDir) {
			client.build.emptyOutDir = false;
		}
	},
});

/** Builds browser assets and renders pages inside the runtime for database access, writing a separate static site without requiring `lucidcms build` first. */
const buildSite = async (
	options: SitePluginOptionsInternal,
	props: BuildProps,
) => {
	const { projectRoot, logger } = props;

	if (options.mode !== "static") {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message:
				"site:build only builds static sites. Set the site plugin's mode to 'static'.",
		});
	}

	const outDir = path.resolve(projectRoot, options.static.outDir);
	assertOutputFolder({
		outDir,
		projectRoot,
		siteRoot: path.resolve(projectRoot, options.directory),
		publicFiles: props.publicFiles,
	});

	const clientDir = path.join(
		pluginDirectory(PLUGIN_KEY, projectRoot),
		"static-client",
	);
	// Created before the output folder is emptied, so a project Lucid can't build, such as one a framework serves, keeps it.
	const viteConfig = await props.viteConfig();
	const builder = await createBuilder({
		...viteConfig,
		plugins: [...(viteConfig.plugins ?? []), clientOutDir(clientDir)],
	});

	await rm(outDir, { recursive: true, force: true });

	const sitePublicFiles = props.publicFiles.filter(
		(file) => !file.name.startsWith(`${pluginPublicDirectory}/`),
	);
	await Promise.all(
		sitePublicFiles.map(async (file) => {
			const target = path.join(outDir, file.name);
			await mkdir(path.dirname(target), { recursive: true });
			await copyFile(file.path, target);
		}),
	);

	const { client } = builder.environments;
	if (!client) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: "The project has no client environment to build the site in.",
		});
	}

	await builder.build(client);

	const data = getSiteVitePluginApi(builder.config)?.clientBuild();
	if (!data) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: "The client build didn't run the site's Vite plugin.",
		});
	}

	// Runtimes may place the client output themselves, such as Cloudflare's in its Worker's assets, so the files are read
	// from where the build wrote them. Only the folder asked for is removed afterwards.
	const builtDir = path.resolve(
		builder.config.root,
		client.config.build.outDir,
	);
	const files = listSiteFiles(data);
	await addReferencedFiles({
		outDir: builtDir,
		assetsDir: client.config.build.assetsDir,
		files,
	});

	await Promise.all(
		[...files].map(async (file) => {
			const target = path.join(outDir, file);
			await mkdir(path.dirname(target), { recursive: true });
			await copyFile(path.join(builtDir, file), target);
		}),
	);

	if (builtDir === clientDir) {
		await rm(clientDir, { recursive: true, force: true });
	}

	const result = await props.runTask<RenderSiteTask>("build", {
		data,
		publicPaths: sitePublicFiles.map((file) => normalizePath(`/${file.name}`)),
	});

	for (const file of result.files) {
		await writeStaticFile(outDir, file.path, file.body);
	}

	for (const failure of result.failures) {
		const error = new Error(failure.message);
		// Pages render in the runtime, so their stacks come from there.
		if (failure.stack) error.stack = failure.stack;
		logger.error(error, `Failed to render ${failure.path}`);
	}

	if (result.failures.length > 0) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `${result.failures.length} of ${result.total} pages failed to render.`,
		});
	}

	logger.info(
		`Built ${result.files.length} files to ${path.relative(process.cwd(), outDir) || "."}`,
	);

	if (result.skipped.length > 0) {
		logger.warn("Skipped these pages", limitDetails(result.skipped));
	}

	for (const warning of result.warnings) {
		logger.warn(warning.message, warning.details);
	}
};

export default buildSite;
