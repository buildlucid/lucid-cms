import path from "node:path";
import { fileURLToPath } from "node:url";
import { getConfigPath } from "@lucidcms/core/helpers";
import type { AstroIntegration } from "astro";
import {
	CROSS_FETCH_ALIAS_KEY,
	CROSS_FETCH_BROWSER_ENTRY,
	LUCID_ASSET_DIRNAME,
	LUCID_ASTRO_INTEGRATION_NAME,
	LUCID_MOUNT_PATH,
} from "./constants.js";
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

	return {
		name: LUCID_ASTRO_INTEGRATION_NAME,
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
				if (command === "preview") {
					return;
				}

				const configPath = getConfigPath(process.cwd());
				project = await loadLucidProject(configPath);

				codegenDir = fileURLToPath(createCodegenDir());
				assetRoot = path.join(codegenDir, LUCID_ASSET_DIRNAME);

				await prepareAssetSourceTree(project, assetRoot);
				routeEntrypoint = await writeGeneratedRouteFiles({
					project,
					codegenDir,
				});
				await addLucidWatchFiles(project, addWatchFile);

				injectRoute({
					pattern: LUCID_MOUNT_PATH,
					entrypoint: routeEntrypoint,
				});
				injectRoute({
					pattern: `${LUCID_MOUNT_PATH}/[...path]`,
					entrypoint: routeEntrypoint,
				});

				updateConfig({
					vite: {
						resolve:
							project.runtime === "cloudflare"
								? {
										alias: {
											[CROSS_FETCH_ALIAS_KEY]: CROSS_FETCH_BROWSER_ENTRY,
										},
									}
								: undefined,
						plugins: [createLucidDevAssetPlugin(assetRoot)],
					},
				});
			},
			"astro:config:done": async ({ config }) => {
				if (!project) {
					return;
				}

				assertAstroCompatibility(project.runtime, config.adapter as never);

				if (project.runtime === "cloudflare") {
					await writeCloudflareWorkerFiles(project);
				}
			},
			"astro:server:setup": async () => {
				if (!project) {
					return;
				}

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
				if (!project) {
					return;
				}

				await copyBuiltAssets(assetRoot, fileURLToPath(dir));
			},
		},
	};
};

export default lucidCMS;
