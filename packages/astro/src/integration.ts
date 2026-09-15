import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAdmin, getConfigPath } from "@lucidcms/core/build";
import type { AstroIntegration } from "astro";
import constants from "./constants.js";
import { createDevAdminPlugin } from "./integration/admin.js";
import {
	copyAssets,
	createDevAssetPlugin,
	prepareAssets,
} from "./integration/assets.js";
import {
	writeGeneratedModules,
	writeSpaModule,
} from "./integration/generated.js";
import {
	type DevServerLifecycle,
	getDevServerLifecycle,
	teardownDevProject,
	teardownProject,
} from "./integration/lifecycle.js";
import { pauseMigrationWaitLog } from "./integration/logging.js";
import {
	bootstrapDevProject,
	checkProjectCompatibility,
	loadProject,
	type ResolvedLucidProject,
} from "./integration/project.js";
import collectWatchFiles, {
	createResourceWatchPlugin,
} from "./integration/watch.js";
import { registerBuildContext } from "./internal/runtime.js";
import type { LucidAstroOptions } from "./types.js";

/** Creates the Lucid CMS integration for Astro. */
const lucidCMS = (options: LucidAstroOptions = {}): AstroIntegration => {
	let project: ResolvedLucidProject | undefined;
	let generatedDirectory = "";
	let assetRoot = "";
	let assetsCopied = false;
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
				config,
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
					assetsCopied = false;
					await fs.rm(generatedDirectory, { recursive: true, force: true });
					await prepareAssets(
						nextProject,
						assetRoot,
						fileURLToPath(config.publicDir),
					);

					const buildContextId = `${nextProject.hostId}:${command}`;
					registerBuildContext(buildContextId, nextProject.loaded.rawEnv);
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
						`${path.join(projectRoot, ".lucid/vite").split(path.sep).join("/")}/**`,
						`${path.join(projectRoot, ".lucid/cache").split(path.sep).join("/")}/**`,
						...(prepared?.ignoredWatchFiles ?? []).map((filePath) =>
							path.resolve(projectRoot, filePath).split(path.sep).join("/"),
						),
					];

					const resourceWatchFiles = collectWatchFiles(nextProject);
					for (const filePath of resourceWatchFiles) {
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
							...(nextProject.integrationBridge.vite?.ssrEnvironment
								? {
										environments: {
											ssr: nextProject.integrationBridge.vite.ssrEnvironment,
										},
									}
								: {}),
							resolve: {
								alias: {
									...(nextProject.integrationBridge.vite?.aliases ?? {}),
									...(prepared?.vite?.aliases ?? {}),
									[constants.toolkitModuleId]: generated.runtimePath,
								},
							},
							plugins: [
								createDevAssetPlugin(assetRoot),
								createDevAdminPlugin(projectRoot),
								createResourceWatchPlugin(
									nextProject.configPath,
									resourceWatchFiles,
								),
							],
						},
					});

					if (command === "dev" && isRestart) {
						devBootstrap = bootstrapDevProject(nextProject, {
							onPrompt: () =>
								pauseMigrationWaitLog(logger, "astro:config:setup"),
						});
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
			"astro:server:setup": async ({ server, logger }) => {
				if (!project) return;
				devLifecycle?.setServer(server);
				try {
					devBootstrap ??= bootstrapDevProject(project, {
						onPrompt: () => pauseMigrationWaitLog(logger, "astro:server:setup"),
					});
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
			"astro:build:start": async () => {
				if (!project) return;
				try {
					const outDir = path.join(assetRoot, "lucid");
					await buildAdmin({ projectRoot: project.loaded.projectRoot, outDir });
					await writeSpaModule(
						generatedDirectory,
						await fs.readFile(path.join(outDir, "index.html"), "utf8"),
					);
				} catch (error) {
					await teardownProject(project, "build");
					throw error;
				}
			},
			"astro:build:generated": async ({ dir }) => {
				await copyAssets(assetRoot, fileURLToPath(dir));
				assetsCopied = true;
			},
			"astro:build:done": async ({ dir }) => {
				if (!project) return;
				const directory = fileURLToPath(dir);
				try {
					// Astro skips build:generated when no routes are prerendered.
					if (!assetsCopied) await copyAssets(assetRoot, directory);
					await project.integrationBridge.buildDone?.({ directory });
				} finally {
					await teardownProject(project, "build");
				}
			},
		},
	};
};

export default lucidCMS;
