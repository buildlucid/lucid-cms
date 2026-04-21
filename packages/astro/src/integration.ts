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
import { lucidAdminBarIconSvg } from "./internal/admin-bar/icon.js";
import { normalizeLucidAdminBarOptions } from "./internal/admin-bar/shared.js";
import { assertAstroCompatibility } from "./internal/compatibility.js";
import type { LucidAstroIntegrationOptions } from "./types.js";

/**
 * Add Lucid CMS to your Astro project.
 *
 * @example
 * ```ts
 * import { defineConfig } from "astro/config";
 * import lucidCMS from "@lucidcms/astro";
 *
 * export default defineConfig({
 * 	integrations: [lucidCMS()],
 * });
 * ```
 */
const lucidCMS = (
	options: LucidAstroIntegrationOptions = {},
): AstroIntegration => {
	let project: ResolvedLucidProject | undefined;
	let assetRoot = "";
	let codegenDir = "";
	let routeEntrypoint = "";
	let middlewareEntrypoint = "";
	let devToolbarAppEntrypoint = "";
	let devBootstrapPromise: Promise<void> | undefined;
	let currentCommand: "dev" | "build" | "preview" | "sync" | undefined;
	const registeredWatchPaths = new Set<string>();

	return {
		name: astroConstants.integration.name,
		hooks: {
			"astro:config:setup": async ({
				addDevToolbarApp,
				addMiddleware,
				addWatchFile,
				command,
				config,
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
				const lucidSsrExternal = [
					"@lucidcms/core",
					"@lucidcms/astro",
					project.runtime === "cloudflare"
						? "@lucidcms/cloudflare-adapter"
						: "@lucidcms/node-adapter",
				];

				if (project.runtime === "cloudflare") {
					(globalThis as Record<string, unknown>)[
						astroConstants.cloudflare.prerenderContextGlobal
					] = {
						config: project.loaded.config,
						env: project.loaded.env,
					};
				}

				codegenDir = fileURLToPath(createCodegenDir());
				assetRoot = path.join(codegenDir, astroConstants.paths.assetDirname);
				const adminBarOptions = normalizeLucidAdminBarOptions(options.adminBar);

				await prepareAssetSourceTree(project, assetRoot);
				const generatedFiles = await writeGeneratedRouteFiles({
					project,
					codegenDir,
					adminBar: adminBarOptions,
				});
				routeEntrypoint = generatedFiles.routePath;
				middlewareEntrypoint = generatedFiles.middlewarePath;
				devToolbarAppEntrypoint = generatedFiles.devToolbarAppPath;
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
				if (
					!adminBarOptions.disable &&
					(command === "dev" || config.output === "server")
				) {
					addMiddleware({
						order: "post",
						entrypoint: middlewareEntrypoint,
					});
				}
				if (!adminBarOptions.disable && command === "dev") {
					addDevToolbarApp({
						id: astroConstants.integration.adminBarDevToolbarAppId,
						name: astroConstants.integration.adminBarDevToolbarAppName,
						icon: lucidAdminBarIconSvg,
						entrypoint: devToolbarAppEntrypoint,
					});
				}

				updateConfig({
					vite: {
						...(command === "dev"
							? {
									ssr: {
										external: lucidSsrExternal,
									},
								}
							: {}),
						resolve: {
							alias: {
								[astroConstants.integration.toolkitModuleId]: path.join(
									codegenDir,
									astroConstants.files.toolkitModule,
								),
								...(project.runtime === "cloudflare"
									? {
											[astroConstants.cloudflare.crossFetchAliasKey]:
												astroConstants.cloudflare.crossFetchBrowserEntry,
										}
									: {}),
							},
						},
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
