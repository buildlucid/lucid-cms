import fs from "node:fs/promises";
import path from "node:path";
import { prepareBuildArtifacts } from "@lucidcms/core/build";
import astroConstants from "../constants.js";
import {
	buildCloudflareRouteSource,
	buildNodeRouteSource,
} from "../internal/generated-sources.js";
import { toImportPath, toPosixPath } from "../internal/paths.js";
import {
	buildCloudflareAdditionalWorkers,
	buildCloudflareMainWorkerSource,
} from "../internal/worker-module.js";
import { ensureDirectory } from "./filesystem.js";
import type { ResolvedLucidProject } from "./project.js";

/**
 * Astro routes need generated modules because Lucid's config, rendered email
 * templates and SPA shell all live outside Astro's normal source ownership.
 */
export const writeGeneratedRouteFiles = async (props: {
	project: ResolvedLucidProject;
	codegenDir: string;
}) => {
	await ensureDirectory(props.codegenDir);

	const emailTemplatesModulePath = path.join(
		props.codegenDir,
		astroConstants.files.emailTemplatesModule,
	);
	const spaHtmlModulePath = path.join(
		props.codegenDir,
		astroConstants.files.spaHtmlModule,
	);
	const spaHtmlPath = path.join(
		props.codegenDir,
		astroConstants.paths.assetDirname,
		astroConstants.paths.mountPath.replace(/^\//, ""),
		astroConstants.files.indexHtml,
	);
	const spaHtml = await fs.readFile(spaHtmlPath, "utf-8");

	const configImportPath = toImportPath(
		props.codegenDir,
		props.project.configPath,
	);
	const routeFilename =
		props.project.runtime === "node"
			? astroConstants.files.nodeRoute
			: astroConstants.files.cloudflareRoute;
	const routePath = path.join(props.codegenDir, routeFilename);
	const routeSource =
		props.project.runtime === "node"
			? buildNodeRouteSource(configImportPath)
			: buildCloudflareRouteSource(configImportPath);

	await Promise.all([
		fs.writeFile(
			emailTemplatesModulePath,
			`const emailTemplates = ${JSON.stringify(props.project.emailTemplates, null, 2)};
export default emailTemplates;
`,
		),
		fs.writeFile(
			spaHtmlModulePath,
			`const spaHtml = ${JSON.stringify(spaHtml)};
export default spaHtml;
`,
		),
		fs.writeFile(routePath, routeSource),
	]);

	return routePath;
};

/**
 * Cloudflare sidecar artifacts still need Lucid-owned worker files, but we
 * isolate them under `.lucid/astro` so Astro remains the primary app build.
 */
export const writeCloudflareWorkerFiles = async (
	project: ResolvedLucidProject,
) => {
	const workerDir = path.join(process.cwd(), astroConstants.paths.workerDir);
	await fs.rm(workerDir, { recursive: true, force: true });
	await ensureDirectory(workerDir);

	const outputRelativeConfigPath = toPosixPath(
		path.relative(workerDir, project.configPath),
	);

	const processedArtifacts = await prepareBuildArtifacts({
		config: project.loaded.config,
		silent: true,
		configPath: project.configPath,
		outputPath: workerDir,
		outputRelativeConfigPath,
		customArtifactTypes: [
			astroConstants.workerArtifacts.exportType,
			astroConstants.workerArtifacts.entryType,
		],
	});

	const mainWorkerSource = buildCloudflareMainWorkerSource({
		configImportPath: outputRelativeConfigPath,
		customArtifacts: processedArtifacts.custom,
	});

	const additionalWorkers = buildCloudflareAdditionalWorkers(
		processedArtifacts.custom,
	);

	await Promise.all([
		fs.writeFile(
			path.join(workerDir, astroConstants.files.emailTemplatesJson),
			JSON.stringify(project.emailTemplates, null, 2),
		),
		fs.writeFile(
			path.join(workerDir, astroConstants.files.worker),
			mainWorkerSource,
		),
		...additionalWorkers.map(async (worker) => {
			const extension = path.extname(worker.filename)
				? ""
				: astroConstants.files.typescriptExtension;
			await fs.writeFile(
				path.join(workerDir, `${worker.filename}${extension}`),
				worker.source,
			);
		}),
	]);
};
