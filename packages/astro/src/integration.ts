import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	buildAdmin,
	createAdminClientConfig,
	getConfigPath,
} from "@lucidcms/core/build";
import { builtAssets } from "@lucidcms/core/runtime";
import {
	findLucidViteApi,
	type LucidViteProject,
	lucid,
} from "@lucidcms/core/vite";
import type { AstroIntegration } from "astro";
import constants from "./constants.js";
import collectWatchFiles, {
	createResourceWatchPlugin,
} from "./integration/watch.js";
import type { LucidAstroOptions } from "./types.js";

/** Adds Lucid's routes, type updates and admin output to Astro, using runtime server wrapping and waiting for development migrations before reporting readiness. */
const lucidCMS = (options: LucidAstroOptions = {}): AstroIntegration => {
	let project: LucidViteProject | undefined;
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
					host: constants.hostKey,
					mode: command === "build" ? "production" : "development",
					adminDocument: () => adminDocument,
					// Astro's adapter builds its server module as the `ssr` environment's `index` input.
					serverEntry: { environment: "ssr", input: "index" },
					// Astro's Cloudflare adapter runs this Worker unless the project names its own.
					workerEntry: "@astrojs/cloudflare/entrypoints/server",
				});
				const api = findLucidViteApi(plugins);
				ready = api.ready;
				adminBuildDirectory = path.join(
					api.project.projectRoot,
					constants.adminBuildDirectory,
				);

				const watchFiles = collectWatchFiles(api.project);
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

				// Its modules import `lucid:hosted`, which only the project's Vite app can serve.
				const serverEnvironment = {
					optimizeDeps: { exclude: [constants.integrationName] },
				};

				updateConfig({
					vite: {
						environments: {
							ssr: serverEnvironment,
							// Builds prerender pages in their own environment, which may bundle Lucid too.
							...(command === "build" && { prerender: serverEnvironment }),
						},
						// Its modules import `lucid:hosted`, so Vite must bundle them rather than leave them to Node.
						ssr: { noExternal: [constants.integrationName] },
						plugins: [
							...plugins,
							createResourceWatchPlugin(api.project.configPath, watchFiles),
						],
					},
				});

				project = api.project;
			},
			// Astro prints that its server is ready after this hook, so migrations run first, with any prompts they need.
			"astro:server:start": async ({ logger }) => {
				if (ready && !(await ready)) {
					logger.warn(
						"Lucid answers requests with an error until its migrations complete. Fix the problem above, then save a file to retry.",
					);
				}
			},
			"astro:build:start": async () => {
				if (!project) return;

				await buildAdmin({
					configPath: project.configPath,
					projectRoot: project.projectRoot,
					outDir: adminBuildDirectory,
					assetsDir: builtAssets.directory,
					admin: project.config.admin,
					clientConfig: createAdminClientConfig(project.config),
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
