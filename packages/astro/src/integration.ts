import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	getConfigPath,
	handlePluginBuildHooks,
	loadConfigFile,
	migrateCommand,
	prepareLucidPublicAssets,
	prepareLucidSPA,
	processBuildArtifacts,
	renderMjmlTemplates,
	validateEnvVars,
} from "@lucidcms/core/helpers";
import type { AstroIntegration } from "astro";
import { lookup as lookupMimeType } from "mime-types";
import type { Plugin } from "vite";
import {
	LUCID_MOUNT_PATH,
	LUCID_WORKER_DIR,
	WORKER_ENTRY_ARTIFACT_TYPE,
	WORKER_EXPORT_ARTIFACT_TYPE,
} from "./constants.js";
import {
	assertAstroCompatibility,
	buildCloudflareAdditionalWorkers,
	buildCloudflareMainWorkerSource,
	buildCloudflareRouteSource,
	buildNodeRouteSource,
	detectLucidRuntime,
	toImportPath,
	toPosixPath,
} from "./internal.js";
import type { LucidAstroRuntime } from "./types.js";

type LoadConfigResult = Awaited<ReturnType<typeof loadConfigFile>>;
type RenderedTemplates = Awaited<ReturnType<typeof renderMjmlTemplates>>;

type ResolvedLucidProject = {
	configPath: string;
	runtime: LucidAstroRuntime;
	loaded: LoadConfigResult;
	emailTemplates: RenderedTemplates;
};

const ensureDirectory = async (dirPath: string) => {
	await fs.mkdir(dirPath, { recursive: true });
};

const pathExists = async (targetPath: string) => {
	try {
		await fs.stat(targetPath);
		return true;
	} catch {
		return false;
	}
};

const collectFiles = async (rootDir: string): Promise<string[]> => {
	const entries = await fs.readdir(rootDir, { withFileTypes: true });
	const files = await Promise.all(
		entries.map(async (entry) => {
			const fullPath = path.join(rootDir, entry.name);
			if (entry.isDirectory()) {
				return collectFiles(fullPath);
			}
			return [fullPath];
		}),
	);

	return files.flat();
};

const createLucidDevAssetPlugin = (assetRoot: string): Plugin => ({
	name: "@lucidcms/astro:assets-dev",
	apply: "serve",
	configureServer(server) {
		server.middlewares.use(async (req, res, next) => {
			if (!req.url) {
				next();
				return;
			}

			const pathname = decodeURIComponent(
				new URL(req.url, "http://astro.local").pathname,
			);
			if (!pathname.startsWith(`${LUCID_MOUNT_PATH}/`)) {
				next();
				return;
			}

			const filePath = path.join(assetRoot, pathname.replace(/^\/+/, ""));
			if (!toPosixPath(filePath).startsWith(toPosixPath(assetRoot))) {
				next();
				return;
			}

			try {
				const stats = await fs.stat(filePath);
				if (!stats.isFile()) {
					next();
					return;
				}
			} catch {
				next();
				return;
			}

			res.statusCode = 200;
			res.setHeader(
				"Content-Type",
				lookupMimeType(filePath) || "application/octet-stream",
			);
			createReadStream(filePath).pipe(res);
		});
	},
});

const createLucidBuildAssetPlugin = (assetRoot: string): Plugin => ({
	name: "@lucidcms/astro:assets-build",
	async generateBundle() {
		if (!(await pathExists(assetRoot))) {
			return;
		}

		const files = await collectFiles(assetRoot);
		for (const filePath of files) {
			const source = await fs.readFile(filePath);
			this.emitFile({
				type: "asset",
				fileName: toPosixPath(path.relative(assetRoot, filePath)),
				source,
			});
		}
	},
});

const loadLucidProject = async (
	configPath: string,
): Promise<ResolvedLucidProject> => {
	const loaded = await loadConfigFile({
		path: configPath,
		silent: true,
	});

	const envValid = await validateEnvVars({
		envSchema: loaded.envSchema,
		env: loaded.env,
	});

	if (!envValid) {
		throw new Error(
			"Lucid Astro integration could not validate the environment variables for lucid.config.ts.",
		);
	}

	return {
		configPath,
		runtime: detectLucidRuntime(loaded.adapter),
		emailTemplates: await renderMjmlTemplates({
			config: loaded.config,
			silent: true,
		}),
		loaded,
	};
};

const prepareAssetSourceTree = async (
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

const copyBuiltAssets = async (assetRoot: string, buildDir: string) => {
	if (!(await pathExists(assetRoot))) {
		return;
	}

	const clientDir = path.join(buildDir, "client");
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

const writeGeneratedRouteFiles = async (props: {
	project: ResolvedLucidProject;
	codegenDir: string;
}) => {
	await ensureDirectory(props.codegenDir);

	const emailTemplatesModulePath = path.join(
		props.codegenDir,
		"lucid-email-templates.generated.ts",
	);
	const spaHtmlModulePath = path.join(
		props.codegenDir,
		"lucid-spa-html.generated.ts",
	);
	const spaHtmlPath = path.join(
		props.codegenDir,
		"lucid-public",
		LUCID_MOUNT_PATH.replace(/^\//, ""),
		"index.html",
	);
	const spaHtml = await fs.readFile(spaHtmlPath, "utf-8");

	await fs.writeFile(
		emailTemplatesModulePath,
		`const emailTemplates = ${JSON.stringify(props.project.emailTemplates, null, 2)};
export default emailTemplates;
`,
	);

	await fs.writeFile(
		spaHtmlModulePath,
		`const spaHtml = ${JSON.stringify(spaHtml)};
export default spaHtml;
`,
	);

	const configImportPath = toImportPath(
		props.codegenDir,
		props.project.configPath,
	);
	const routeFilename =
		props.project.runtime === "node"
			? "lucid-node.route.ts"
			: "lucid-cloudflare.route.ts";
	const routePath = path.join(props.codegenDir, routeFilename);

	await fs.writeFile(
		routePath,
		props.project.runtime === "node"
			? buildNodeRouteSource(configImportPath)
			: buildCloudflareRouteSource(configImportPath),
	);

	return routePath;
};

const writeCloudflareWorkerFiles = async (project: ResolvedLucidProject) => {
	const workerDir = path.join(process.cwd(), LUCID_WORKER_DIR);
	await fs.rm(workerDir, { recursive: true, force: true });
	await ensureDirectory(workerDir);

	const outputRelativeConfigPath = toPosixPath(
		path.relative(workerDir, project.configPath),
	);

	const pluginArtifacts = await handlePluginBuildHooks({
		config: project.loaded.config,
		silent: true,
		configPath: project.configPath,
		outputPath: workerDir,
		outputRelativeConfigPath,
	});

	if (pluginArtifacts.error || !pluginArtifacts.data) {
		throw new Error(
			pluginArtifacts.error?.message ??
				"Lucid Astro integration failed to collect Cloudflare plugin build artifacts.",
		);
	}

	const processedArtifacts = await processBuildArtifacts({
		artifacts: pluginArtifacts.data,
		outDir: workerDir,
		silent: true,
		customArtifactTypes: [
			WORKER_EXPORT_ARTIFACT_TYPE,
			WORKER_ENTRY_ARTIFACT_TYPE,
		],
	});

	await fs.writeFile(
		path.join(workerDir, "email-templates.json"),
		JSON.stringify(project.emailTemplates, null, 2),
	);

	await fs.writeFile(
		path.join(workerDir, "worker.ts"),
		buildCloudflareMainWorkerSource({
			configImportPath: outputRelativeConfigPath,
			customArtifacts: processedArtifacts.custom,
		}),
	);

	const additionalWorkers = buildCloudflareAdditionalWorkers(
		processedArtifacts.custom,
	);

	await Promise.all(
		additionalWorkers.map(async (worker) => {
			const extension = path.extname(worker.filename) ? "" : ".ts";
			await fs.writeFile(
				path.join(workerDir, `${worker.filename}${extension}`),
				worker.source,
			);
		}),
	);
};

const addLucidWatchFiles = async (
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

const runDevBootstrap = async (
	project: ResolvedLucidProject,
): Promise<void> => {
	const migrationResult = await migrateCommand({
		config: project.loaded.config,
		mode: "return",
	})({
		force: true,
		skipEnvValidation: true,
		skipSyncSteps: false,
	});

	if (!migrationResult) {
		throw new Error(
			"Lucid Astro integration could not prepare the Lucid schema for astro dev.",
		);
	}
};

const lucid = (): AstroIntegration => {
	let project: ResolvedLucidProject | undefined;
	let assetRoot = "";
	let codegenDir = "";
	let routeEntrypoint = "";
	let devBootstrapPromise: Promise<void> | undefined;

	return {
		name: "@lucidcms/astro",
		hooks: {
			"astro:config:setup": async ({
				addWatchFile,
				createCodegenDir,
				injectRoute,
				updateConfig,
			}) => {
				const configPath = getConfigPath(process.cwd());
				project = await loadLucidProject(configPath);

				codegenDir = fileURLToPath(createCodegenDir());
				assetRoot = path.join(codegenDir, "lucid-public");

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

export default lucid;
