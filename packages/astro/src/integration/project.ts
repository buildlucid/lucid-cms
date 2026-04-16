import fs from "node:fs/promises";
import path from "node:path";
import {
	loadBuildProject,
	prepareLucidPublicAssets,
	prepareLucidSPA,
} from "@lucidcms/core/build";
import { migrateCommand } from "@lucidcms/core/helpers";
import {
	ASTRO_CLIENT_DIRNAME,
	ASTRO_DEFINE_CONFIG_MODULE_ID,
	CLOUDFLARE_DEV_ENV_GLOBAL,
	LUCID_MOUNT_PATH,
} from "../constants.js";
import { detectLucidRuntime } from "../internal/compatibility.js";

import type { LucidAstroRuntime } from "../types.js";
import { collectFiles, ensureDirectory, pathExists } from "./filesystem.js";

type BuildProject = Awaited<ReturnType<typeof loadBuildProject>>;
type LoadConfigResult = BuildProject["loaded"];
type RenderedTemplates = NonNullable<BuildProject["emailTemplates"]>;

export type ResolvedLucidProject = {
	configPath: string;
	runtime: LucidAstroRuntime;
	loaded: LoadConfigResult;
	emailTemplates: RenderedTemplates;
};

/**
 * Astro config setup is where we establish Lucid's hosted view of the world so
 * every later hook can reuse the same resolved project snapshot.
 */
export const loadLucidProject = async (
	configPath: string,
): Promise<ResolvedLucidProject> => {
	const project = await loadBuildProject({
		configPath,
		silent: true,
		validateEnv: true,
		renderEmailTemplates: true,
		defineConfigPath: ASTRO_DEFINE_CONFIG_MODULE_ID,
		loadRuntime: true,
	});

	if (!project.emailTemplates) {
		throw new Error(
			"Lucid Astro integration could not prepare email templates for build.",
		);
	}

	return {
		configPath,
		runtime: detectLucidRuntime(project.loaded.adapter),
		emailTemplates: project.emailTemplates,
		loaded: project.loaded,
	};
};

/**
 * Astro dev re-runs config resolution right before migrate/sync so Lucid sees
 * the same wrapper semantics during bootstrap as it does during route startup.
 */
export const reloadLucidProjectForDevBootstrap = async (
	project: ResolvedLucidProject,
): Promise<ResolvedLucidProject> => {
	if (project.runtime !== "cloudflare") {
		return project;
	}

	const reloaded = await loadBuildProject({
		configPath: project.configPath,
		silent: true,
		validateEnv: true,
		generateTypes: false,
		renderEmailTemplates: false,
		defineConfigPath: ASTRO_DEFINE_CONFIG_MODULE_ID,
		loadRuntime: true,
	});

	return {
		...project,
		loaded: reloaded.loaded,
	};
};

/**
 * Lucid keeps its admin assets in its own prepared tree so Astro can mount them
 * regardless of whether the host app builds statically or as a server output.
 */
export const prepareAssetSourceTree = async (
	project: ResolvedLucidProject,
	assetRoot: string,
) => {
	await fs.rm(assetRoot, { recursive: true, force: true });
	await ensureDirectory(assetRoot);

	const publicResult = await prepareLucidPublicAssets({
		config: project.loaded.config,
		outDir: assetRoot,
		projectRoot: process.cwd(),
		includeProjectPublic: false,
		silent: true,
	});

	if (publicResult.error) {
		throw new Error(publicResult.error.message);
	}

	const spaResult = await prepareLucidSPA({
		outDir: path.join(assetRoot, LUCID_MOUNT_PATH.replace(/^\//, "")),
	});

	if (spaResult.error) {
		throw new Error(spaResult.error.message);
	}
};

/**
 * Astro's final output directory differs between static and server builds, so
 * this post-build copy keeps Lucid assets visible in both layouts.
 */
export const copyBuiltAssets = async (assetRoot: string, buildDir: string) => {
	if (!(await pathExists(assetRoot))) {
		return;
	}

	const clientDir = path.join(buildDir, ASTRO_CLIENT_DIRNAME);
	const outputDir = (await pathExists(clientDir)) ? clientDir : buildDir;
	const files = await collectFiles(assetRoot);

	await Promise.all(
		files.map(async (filePath) => {
			const relativePath = path.relative(assetRoot, filePath);
			const targetPath = path.join(outputDir, relativePath);

			await ensureDirectory(path.dirname(targetPath));
			await fs.copyFile(filePath, targetPath);
		}),
	);
};

/**
 * Lucid owns additional inputs outside Astro's src tree, so we register them
 * explicitly to keep the integration responsive during config and asset edits.
 */
export const addLucidWatchFiles = async (
	project: ResolvedLucidProject,
	addWatchFile: (path: string | URL) => void,
) => {
	addWatchFile(project.configPath);
	addWatchFile(
		path.isAbsolute(project.loaded.config.build.paths.emailTemplates)
			? project.loaded.config.build.paths.emailTemplates
			: path.join(
					process.cwd(),
					project.loaded.config.build.paths.emailTemplates,
				),
	);

	for (const entry of project.loaded.config.build.paths.copyPublic) {
		const inputPath = typeof entry === "string" ? entry : entry.input;
		const resolvedPath = path.isAbsolute(inputPath)
			? inputPath
			: path.join(process.cwd(), inputPath);
		addWatchFile(resolvedPath);
	}
};

/**
 * Astro dev should feel like the Lucid CLI from a schema perspective, so we
 * run migrate/sync here instead of requiring a separate preflight command.
 */
export const runDevBootstrap = async (
	project: ResolvedLucidProject,
): Promise<void> => {
	const bootstrapProject = await reloadLucidProjectForDevBootstrap(project);

	if (bootstrapProject.runtime === "cloudflare") {
		(globalThis as Record<string, unknown>)[CLOUDFLARE_DEV_ENV_GLOBAL] =
			bootstrapProject.loaded.env;
	}

	const migrationResult = await migrateCommand({
		config: bootstrapProject.loaded.config,
		mode: "return",
	})({
		force: false,
		skipEnvValidation: true,
		skipSyncSteps: false,
	});

	if (!migrationResult) {
		throw new Error(
			"Lucid Astro integration could not prepare the Lucid schema for astro dev.",
		);
	}
};
