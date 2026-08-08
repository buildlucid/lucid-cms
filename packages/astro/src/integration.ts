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
	type DevServerLifecycle,
	getDevServerLifecycle,
	teardownDevProject,
	teardownProject,
} from "./integration/lifecycle.js";
import {
	bootstrapDevProject,
	checkProjectCompatibility,
	loadProject,
	type ResolvedLucidProject,
} from "./integration/project.js";
import collectWatchFiles from "./integration/watch.js";
import { registerBuildContext } from "./internal/runtime.js";
import type { LucidAstroOptions } from "./types.js";

/** Creates the Lucid CMS integration for Astro. */
const lucidCMS = (options: LucidAstroOptions = {}): AstroIntegration => {
	let project: ResolvedLucidProject | undefined;
	let generatedDirectory = "";
	let assetRoot = "";
	let devBootstrap: Promise<void> | undefined;
	let devLifecycle: DevServerLifecycle | undefined;
	let projectCommand: "dev" | "build" | "sync" | undefined;

	return {
		name: constants.integrationName,
		hooks: {
			"astro:config:setup": async ({
				addMiddleware,
				addWatchFile,
				command,
				injectRoute,
				isRestart,
				logger,
				updateConfig,
			}) => {
				if (command === "preview") return;

				const configPath = options.configPath ?? getConfigPath(process.cwd());
				if (command === "dev") {
					devLifecycle = getDevServerLifecycle(configPath, logger);
					devLifecycle.register();
					if (isRestart) devBootstrap = undefined;
				}

				let nextProject: ResolvedLucidProject | undefined;
				try {
					nextProject = await loadProject(configPath);
					if (command === "dev") devLifecycle?.trackProject(nextProject);
					await checkProjectCompatibility(nextProject, command === "build");
					const projectRoot = nextProject.loaded.projectRoot;
					generatedDirectory = path.join(
						projectRoot,
						constants.generatedDirectory,
					);
					assetRoot = path.join(generatedDirectory, constants.assetDirectory);
					await fs.rm(generatedDirectory, { recursive: true, force: true });
					await prepareAssets(nextProject, assetRoot);

					const buildContextId = `${nextProject.hostId}:${command}`;
					registerBuildContext(buildContextId, nextProject.loaded.env);
					const generated = await writeGeneratedModules({
						project: nextProject,
						directory: generatedDirectory,
						buildContextId,
						compiled: command === "build",
					});
					const prepared = await nextProject.integrationBridge.prepare?.({
						command,
						adapter: nextProject.loaded.adapter,
						configPath: nextProject.configPath,
						projectRoot: nextProject.loaded.projectRoot,
						generatedDirectory,
						runtimeModulePath: generated.runtimePath,
						config: nextProject.loaded.config,
						translationStore: nextProject.loaded.translationStore,
						definition: nextProject.loaded.definition,
					});
					const ignoredWatchFiles = [
						`${generatedDirectory.split(path.sep).join("/")}/**`,
						...(prepared?.ignoredWatchFiles ?? []).map((filePath) =>
							path.resolve(projectRoot, filePath).split(path.sep).join("/"),
						),
					];

					for (const filePath of await collectWatchFiles(nextProject)) {
						addWatchFile(filePath);
					}

					addMiddleware({
						entrypoint: generated.middlewarePath,
						order: "pre",
					});
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
							...(nextProject.integrationBridge.vite?.ssrExternal
								? {
										ssr: {
											external: nextProject.integrationBridge.vite.ssrExternal,
										},
									}
								: {}),
							resolve: {
								alias: {
									...(nextProject.integrationBridge.vite?.aliases ?? {}),
									[constants.toolkitModuleId]: generated.runtimePath,
								},
							},
							plugins: [createDevAssetPlugin(assetRoot)],
						},
					});

					if (command === "dev" && isRestart) {
						devBootstrap = bootstrapDevProject(nextProject);
						await devBootstrap;
					}
					project = nextProject;
					projectCommand = command;
				} catch (error) {
					if (nextProject) {
						if (command === "dev") {
							await devLifecycle?.releaseProject(nextProject).catch(() => {});
						} else {
							await teardownProject(nextProject, command).catch(() => {});
						}
					}
					if (command === "dev" && !devLifecycle?.hasActiveProject()) {
						await devLifecycle?.shutdown().catch(() => {});
					}
					throw error;
				}
			},
			"astro:config:done": async ({ config }) => {
				const currentProject = project;
				const currentCommand = projectCommand;
				if (!currentProject || !currentCommand) return;
				try {
					currentProject.integrationBridge.validateAdapter(config.adapter);
					if (currentCommand === "dev") {
						await devLifecycle?.activateProject(currentProject);
					} else if (currentCommand === "sync") {
						await teardownProject(currentProject, "sync");
						project = undefined;
						projectCommand = undefined;
					}
				} catch (error) {
					if (currentCommand === "dev") {
						await devLifecycle?.releaseProject(currentProject).catch(() => {});
						if (!devLifecycle?.hasActiveProject()) {
							await devLifecycle?.shutdown().catch(() => {});
						}
					} else {
						await teardownProject(currentProject, currentCommand).catch(
							() => {},
						);
					}
					project = undefined;
					projectCommand = undefined;
					throw error;
				}
			},
			"astro:server:setup": async ({ server }) => {
				if (!project) return;
				devLifecycle?.setServer(server);
				try {
					devBootstrap ??= bootstrapDevProject(project);
					await devBootstrap;
				} catch (error) {
					await devLifecycle?.shutdown().catch(() => {});
					throw error;
				}
			},
			"astro:server:done": async () => {
				if (devLifecycle) {
					await devLifecycle.shutdown();
				} else if (project) {
					await teardownDevProject(project);
				}
			},
			"astro:build:done": async ({ dir }) => {
				if (!project) return;
				const directory = fileURLToPath(dir);
				try {
					await Promise.all([
						copyAssets(assetRoot, directory),
						project.integrationBridge.buildDone?.({ directory }),
					]);
				} finally {
					await teardownProject(project, "build");
				}
			},
		},
	};
};

export default lucidCMS;
