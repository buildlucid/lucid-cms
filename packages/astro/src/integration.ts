import path from "node:path";
import { fileURLToPath } from "node:url";
import { getConfigPath } from "@lucidcms/core/build";
import type { AstroIntegration } from "astro";
import astroConstants from "./constants.js";
import {
	createLucidBuildAssetPlugin,
	createLucidDevAssetPlugin,
} from "./integration/asset-plugins.js";
import {
	writeCloudflareWorkerFiles,
	writeGeneratedRouteFiles,
} from "./integration/generated-files.js";
import {
	addLucidWatchFiles,
	assertLucidPluginCompatibility,
	copyBuiltAssets,
	loadLucidProject,
	prepareAssetSourceTree,
	type ResolvedLucidProject,
	runDevBootstrap,
} from "./integration/project.js";
import { assertAstroCompatibility } from "./internal/compatibility.js";

/**
 * Lucid is hosted inside Astro, so this integration focuses on preparing the
 * Lucid runtime and assets while leaving Astro in charge of the app lifecycle.
 */
const lucidCMS = (): AstroIntegration => {
	let project: ResolvedLucidProject | undefined;
	let assetRoot = "";
	let codegenDir = "";
	let routeEntrypoint = "";
	let devBootstrapPromise: Promise<void> | undefined;
	let currentCommand: "dev" | "build" | "preview" | "sync" | undefined;
	const registeredWatchPaths = new Set<string>();

	return {
		name: astroConstants.integration.name,
		hooks: {
			"astro:config:setup": async ({
				addWatchFile,
				command,
				createCodegenDir,
				injectRoute,
				updateConfig,
			}) => {
				// Preview serves Astro's built output, so reloading lucid.config.ts from
				// source here would make preview depend on files that are no longer part
				// of the deployable artifact.
				if (command === "preview") return;

				currentCommand = command;
				const configPath = getConfigPath(process.cwd());
				project = await loadLucidProject(configPath);
				devBootstrapPromise = undefined;

				codegenDir = fileURLToPath(createCodegenDir());
				assetRoot = path.join(codegenDir, astroConstants.paths.assetDirname);

				await prepareAssetSourceTree(project, assetRoot);
				routeEntrypoint = await writeGeneratedRouteFiles({
					project,
					codegenDir,
				});
				await addLucidWatchFiles(project, (watchPath) => {
					const normalizedPath =
						typeof watchPath === "string"
							? path.resolve(watchPath)
							: fileURLToPath(watchPath);

					if (registeredWatchPaths.has(normalizedPath)) {
						return;
					}

					registeredWatchPaths.add(normalizedPath);
					addWatchFile(watchPath);
				});

				injectRoute({
					pattern: astroConstants.paths.mountPath,
					entrypoint: routeEntrypoint,
				});
				injectRoute({
					pattern: `${astroConstants.paths.mountPath}/[...path]`,
					entrypoint: routeEntrypoint,
				});

				updateConfig({
					vite: {
						resolve:
							project.runtime === "cloudflare"
								? {
										alias: {
											[astroConstants.cloudflare.crossFetchAliasKey]:
												astroConstants.cloudflare.crossFetchBrowserEntry,
										},
									}
								: undefined,
						plugins: [createLucidDevAssetPlugin(assetRoot)],
					},
				});
			},
			"astro:config:done": async ({ config }) => {
				if (!project) return;

				assertAstroCompatibility(project.runtime, config.adapter as never);
				await assertLucidPluginCompatibility({
					project,
					compiled: currentCommand === "build",
				});

				if (project.runtime === "cloudflare") {
					await writeCloudflareWorkerFiles(project);
				}
			},
			"astro:server:setup": async () => {
				if (!project) return;

				if (!devBootstrapPromise) {
					devBootstrapPromise = runDevBootstrap(project);
				}

				await devBootstrapPromise;
			},
			"astro:build:setup": async ({ target, updateConfig }) => {
				if (!project || target !== "client") {
					return;
				}

				updateConfig({
					plugins: [createLucidBuildAssetPlugin(assetRoot)],
				});
			},
			"astro:build:done": async ({ dir }) => {
				if (!project) return;

				await copyBuiltAssets(assetRoot, fileURLToPath(dir));
			},
		},
	};
};

export default lucidCMS;
