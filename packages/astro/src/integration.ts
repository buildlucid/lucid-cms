import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	buildAdmin,
	createAdminClientConfig,
	getConfigPath,
} from "@lucidcms/core/build";
import { builtAssets } from "@lucidcms/core/runtime";
import { findLucidViteApi, lucid } from "@lucidcms/core/vite";
import type { AstroIntegration } from "astro";
import constants from "./constants.js";
import { astroHost } from "./host.js";
import loadProject, {
	type ResolvedLucidProject,
} from "./integration/project.js";
import runtimeModulePlugin from "./integration/runtime-module-plugin.js";
import collectWatchFiles, {
	createResourceWatchPlugin,
} from "./integration/watch.js";
import { destroyRuntimeHosts } from "./internal/runtime.js";
import type { LucidAstroOptions } from "./types.js";

/** Integrates Lucid's Vite project loading, type updates and development migrations with Astro routes and runtime modules, copying a separate admin build into Astro output and awaiting migration completion before server readiness. */
const lucidCMS = (options: LucidAstroOptions = {}): AstroIntegration => {
	let project: ResolvedLucidProject | undefined;
	/** Settles once the dev server's start-up migrations finish, with whether they completed. */
	let ready: Promise<boolean> | undefined;
	let adminBuildDirectory = "";
	let adminDocument: string | undefined;
	let adminCopied = false;

	/** Copies the admin's build, its document under `admin/` and its assets under Lucid's built assets folder, into Astro's output. */
	const copyAdmin = async (directory: string) => {
		await fs.cp(adminBuildDirectory, directory, { recursive: true });
		adminCopied = true;
	};

	return {
		name: constants.integrationName,
		hooks: {
			"astro:config:setup": async ({
				addMiddleware,
				addWatchFile,
				command,
				injectRoute,
				updateConfig,
			}) => {
				if (command === "preview") return;

				const plugins = await lucid({
					configPath: options.configPath ?? getConfigPath(process.cwd()),
					host: astroHost.key,
					mode: command === "build" ? "production" : "development",
					adminDocument: () => adminDocument,
				});
				const nextProject = await loadProject(plugins);
				ready = findLucidViteApi(plugins).ready;

				const { lucid: lucidProject, integrationBridge } = nextProject;
				adminBuildDirectory = path.join(
					lucidProject.projectRoot,
					constants.adminBuildDirectory,
				);
				const platform =
					integrationBridge.vite?.({
						command,
						project: lucidProject,
						runtimeModuleId: constants.runtimeModuleId,
					}) ?? {};

				const watchFiles = collectWatchFiles(nextProject);
				for (const filePath of watchFiles) addWatchFile(filePath);

				addMiddleware({
					entrypoint: constants.middlewareEntrypoint,
					order: "pre",
				});

				const mountPaths = [
					...constants.mountPaths,
					// Lucid's Vite plugin runs development tasks, such as migrations, through Astro's server.
					...(command === "dev" ? [constants.taskPath] : []),
				];

				for (const mountPath of mountPaths) {
					injectRoute({
						pattern: mountPath,
						entrypoint: constants.routeEntrypoint,
					});
					injectRoute({
						pattern: `${mountPath}/[...path]`,
						entrypoint: constants.routeEntrypoint,
					});
				}

				const serverEnvironment = {
					...platform.ssrEnvironment,
					optimizeDeps: {
						...platform.ssrEnvironment?.optimizeDeps,
						// Its modules import Lucid's runtime module, which only the project's Vite app can serve.
						exclude: [
							...(platform.ssrEnvironment?.optimizeDeps?.exclude ?? []),
							constants.integrationName,
						],
					},
				};

				updateConfig({
					vite: {
						environments: {
							ssr: serverEnvironment,
							// Builds prerender pages in their own environment, which may bundle Lucid too.
							...(command === "build" && { prerender: serverEnvironment }),
						},
						resolve: { alias: platform.aliases ?? {} },
						// Its modules import Lucid's runtime module, so Vite must bundle them rather than leave them to Node.
						ssr: { noExternal: [constants.integrationName] },
						plugins: [
							...plugins,
							runtimeModulePlugin(nextProject),
							...(platform.plugins ?? []),
							createResourceWatchPlugin(lucidProject.configPath, watchFiles),
						],
					},
				});

				project = nextProject;
			},
			// Astro prints that its server is ready after this hook, so migrations run first, with any prompts they need.
			"astro:server:start": async ({ logger }) => {
				if (ready && !(await ready)) {
					logger.warn(
						"Lucid answers requests with an error until its migrations complete. Fix the problem above, then save a file to retry.",
					);
				}
			},
			"astro:config:done": ({ config }) => {
				project?.integrationBridge.validateAdapter(config.adapter);
			},
			"astro:server:done": async () => {
				if (project) await destroyRuntimeHosts(project.hostId);
			},
			"astro:build:start": async () => {
				if (!project) return;

				const { lucid: lucidProject } = project;
				await buildAdmin({
					configPath: lucidProject.configPath,
					projectRoot: lucidProject.projectRoot,
					outDir: adminBuildDirectory,
					assetsDir: builtAssets.directory,
					admin: lucidProject.config.admin,
					clientConfig: createAdminClientConfig(lucidProject.config),
				});

				// The server serves the admin's document for its client-side routes.
				adminDocument = await fs.readFile(
					path.join(adminBuildDirectory, "admin/index.html"),
					"utf8",
				);
				adminCopied = false;
			},
			"astro:build:generated": async ({ dir }) => {
				if (project) await copyAdmin(fileURLToPath(dir));
			},
			"astro:build:done": async ({ dir }) => {
				// Astro skips build:generated when no routes are prerendered.
				if (project && !adminCopied) await copyAdmin(fileURLToPath(dir));
			},
		},
	};
};

export default lucidCMS;
