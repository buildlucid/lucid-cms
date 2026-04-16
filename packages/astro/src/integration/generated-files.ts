import fs from "node:fs/promises";
import path from "node:path";
import { prepareBuildArtifacts } from "@lucidcms/core/helpers";
import {
	LUCID_ASSET_DIRNAME,
	LUCID_CLOUDFLARE_ROUTE_FILENAME,
	LUCID_EMAIL_TEMPLATES_JSON_FILENAME,
	LUCID_EMAIL_TEMPLATES_MODULE_FILENAME,
	LUCID_INDEX_HTML_FILENAME,
	LUCID_MOUNT_PATH,
	LUCID_NODE_ROUTE_FILENAME,
	LUCID_SPA_HTML_MODULE_FILENAME,
	LUCID_WORKER_DIR,
	LUCID_WORKER_FILENAME,
	TYPESCRIPT_FILE_EXTENSION,
	WORKER_ENTRY_ARTIFACT_TYPE,
	WORKER_EXPORT_ARTIFACT_TYPE,
} from "../constants.js";
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
		LUCID_EMAIL_TEMPLATES_MODULE_FILENAME,
	);
	const spaHtmlModulePath = path.join(
		props.codegenDir,
		LUCID_SPA_HTML_MODULE_FILENAME,
	);
	const spaHtmlPath = path.join(
		props.codegenDir,
		LUCID_ASSET_DIRNAME,
		LUCID_MOUNT_PATH.replace(/^\//, ""),
		LUCID_INDEX_HTML_FILENAME,
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
			? LUCID_NODE_ROUTE_FILENAME
			: LUCID_CLOUDFLARE_ROUTE_FILENAME;
	const routePath = path.join(props.codegenDir, routeFilename);

	await fs.writeFile(
		routePath,
		props.project.runtime === "node"
			? buildNodeRouteSource(configImportPath)
			: buildCloudflareRouteSource(configImportPath),
	);

	return routePath;
};

/**
 * Cloudflare sidecar artifacts still need Lucid-owned worker files, but we
 * isolate them under `.lucid/astro` so Astro remains the primary app build.
 */
export const writeCloudflareWorkerFiles = async (
	project: ResolvedLucidProject,
) => {
	const workerDir = path.join(process.cwd(), LUCID_WORKER_DIR);
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
			WORKER_EXPORT_ARTIFACT_TYPE,
			WORKER_ENTRY_ARTIFACT_TYPE,
		],
	});

	await fs.writeFile(
		path.join(workerDir, LUCID_EMAIL_TEMPLATES_JSON_FILENAME),
		JSON.stringify(project.emailTemplates, null, 2),
	);

	await fs.writeFile(
		path.join(workerDir, LUCID_WORKER_FILENAME),
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
			const extension = path.extname(worker.filename)
				? ""
				: TYPESCRIPT_FILE_EXTENSION;
			await fs.writeFile(
				path.join(workerDir, `${worker.filename}${extension}`),
				worker.source,
			);
		}),
	);
};
