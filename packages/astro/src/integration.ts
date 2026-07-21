import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getConfigPath } from "@lucidcms/core/build";
import type { AstroIntegration } from "astro";
import constants from "./constants.js";
import {
	copyAssets,
	createDevAssetPlugin,
	prepareAssets,
} from "./integration/assets.js";
import { writeGeneratedModules } from "./integration/generated.js";
import {
	bootstrapDevProject,
	checkProjectCompatibility,
	loadProject,
	type ResolvedLucidProject,
} from "./integration/project.js";
import collectWatchFiles from "./integration/watch.js";
import {
	destroyRuntimeHosts,
	registerBuildContext,
} from "./internal/runtime.js";
import type { LucidAstroOptions } from "./types.js";

/** Creates the Lucid CMS integration for Astro. */
const lucidCMS = (options: LucidAstroOptions = {}): AstroIntegration => {
	let project: ResolvedLucidProject | undefined;
	let generatedDirectory = "";
	let assetRoot = "";
	let devBootstrap: Promise<void> | undefined;

	return {
		name: constants.integrationName,
		hooks: {
			"astro:config:setup": async ({
				addWatchFile,
				command,
				injectRoute,
				updateConfig,
			}) => {
				if (command === "preview") return;

				const configPath = options.configPath ?? getConfigPath(process.cwd());
				project = await loadProject(configPath);
				await checkProjectCompatibility(project, command === "build");
				const projectRoot = project.loaded.projectRoot;
				generatedDirectory = path.join(
					projectRoot,
					constants.generatedDirectory,
				);
				assetRoot = path.join(generatedDirectory, constants.assetDirectory);
				await fs.rm(generatedDirectory, { recursive: true, force: true });
				await prepareAssets(project, assetRoot);

				const buildContextId = `${project.hostId}:${command}`;
				registerBuildContext(buildContextId, project.loaded.env);
				const generated = await writeGeneratedModules({
					project,
					directory: generatedDirectory,
					buildContextId,
					compiled: command === "build",
				});
				const prepared = await project.integrationBridge.prepare?.({
					command,
					adapter: project.loaded.adapter,
					configPath: project.configPath,
					projectRoot: project.loaded.projectRoot,
					generatedDirectory,
					runtimeModulePath: generated.runtimePath,
					config: project.loaded.config,
					translationStore: project.loaded.translationStore,
					definition: project.loaded.definition,
				});
				const ignoredWatchFiles = [
					`${generatedDirectory.split(path.sep).join("/")}/**`,
					...(prepared?.ignoredWatchFiles ?? []).map((filePath) =>
						path.resolve(projectRoot, filePath).split(path.sep).join("/"),
					),
				];

				for (const filePath of await collectWatchFiles(project)) {
					addWatchFile(filePath);
				}

				injectRoute({
					pattern: constants.mountPath,
					entrypoint: generated.routePath,
				});
				injectRoute({
					pattern: `${constants.mountPath}/[...path]`,
					entrypoint: generated.routePath,
				});
				updateConfig({
					vite: {
						server: {
							watch: {
								ignored: ignoredWatchFiles,
							},
						},
						...(project.integrationBridge.vite?.ssrExternal
							? {
									ssr: {
										external: project.integrationBridge.vite.ssrExternal,
									},
								}
							: {}),
						resolve: {
							alias: {
								...(project.integrationBridge.vite?.aliases ?? {}),
								[constants.toolkitModuleId]: generated.runtimePath,
							},
						},
						plugins: [createDevAssetPlugin(assetRoot)],
					},
				});
			},
			"astro:config:done": ({ config }) => {
				project?.integrationBridge.validateAdapter(config.adapter);
			},
			"astro:server:setup": async () => {
				if (!project) return;
				devBootstrap ??= bootstrapDevProject(project);
				await devBootstrap;
			},
			"astro:server:done": async () => {
				if (project) await destroyRuntimeHosts(project.hostId);
			},
			"astro:build:done": async ({ dir }) => {
				if (!project) return;
				const directory = fileURLToPath(dir);
				await Promise.all([
					copyAssets(assetRoot, directory),
					project.integrationBridge.buildDone?.({ directory }),
				]);
			},
		},
	};
};

export default lucidCMS;
