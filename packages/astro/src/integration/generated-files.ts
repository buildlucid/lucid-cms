import fs from "node:fs/promises";
import path from "node:path";
import {
	getConfigArtifactImportPaths,
	prepareBuildArtifacts,
	prepareConfigArtifacts,
} from "@lucidcms/core/build";
import astroConstants from "../constants.js";
import {
	buildCloudflareRouteSource,
	buildCloudflareToolkitSource,
	buildNodeRouteSource,
	buildNodeToolkitSource,
} from "../internal/generated-sources.js";
import { toPosixPath } from "../internal/paths.js";
import { buildCloudflareMainWorkerSource } from "../internal/worker-module.js";
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
	const i18nTranslationsModulePath = path.join(
		props.codegenDir,
		astroConstants.files.i18nTranslationsModule,
	);
	const spaHtmlModulePath = path.join(
		props.codegenDir,
		astroConstants.files.spaHtmlModule,
	);
	const toolkitModulePath = path.join(
		props.codegenDir,
		astroConstants.files.toolkitModule,
	);
	const spaHtmlPath = path.join(
		props.codegenDir,
		astroConstants.paths.assetDirname,
		astroConstants.paths.mountPath.replace(/^\//, ""),
		astroConstants.files.indexHtml,
	);
	const spaHtml = await fs.readFile(spaHtmlPath, "utf-8");

	await prepareConfigArtifacts({
		configPath: props.project.configPath,
		outputPath: props.codegenDir,
	});
	const configArtifactImports = getConfigArtifactImportPaths(".");
	const routeFilename =
		props.project.runtime === "node"
			? astroConstants.files.nodeRoute
			: astroConstants.files.cloudflareRoute;
	const routePath = path.join(props.codegenDir, routeFilename);
	const routeSource =
		props.project.runtime === "node"
			? buildNodeRouteSource(configArtifactImports)
			: buildCloudflareRouteSource(configArtifactImports);
	const toolkitSource =
		props.project.runtime === "node"
			? buildNodeToolkitSource(configArtifactImports)
			: buildCloudflareToolkitSource(configArtifactImports);

	await Promise.all([
		fs.writeFile(
			emailTemplatesModulePath,
			`const emailTemplates = ${JSON.stringify(props.project.emailTemplates, null, 2)};
export default emailTemplates;
`,
		),
		fs.writeFile(
			i18nTranslationsModulePath,
			`const i18nTranslations = ${JSON.stringify(props.project.loaded.translationStore.bundles, null, 2)};
export default i18nTranslations;
`,
		),
		fs.writeFile(
			spaHtmlModulePath,
			`const spaHtml = ${JSON.stringify(spaHtml)};
export default spaHtml;
`,
		),
		fs.writeFile(toolkitModulePath, toolkitSource),
		fs.writeFile(routePath, routeSource),
	]);

	return {
		routePath,
	};
};

/**
 * Astro's Cloudflare hosting uses a single Lucid-owned worker entry that
 * layers Lucid extensions onto Astro's generated server worker.
 */
export const writeCloudflareWorkerFiles = async (
	project: ResolvedLucidProject,
) => {
	const workerDir = path.join(process.cwd(), astroConstants.paths.workerDir);
	await fs.rm(workerDir, { recursive: true, force: true });
	await ensureDirectory(workerDir);
	await prepareConfigArtifacts({
		configPath: project.configPath,
		outputPath: workerDir,
	});
	const configArtifactImports = getConfigArtifactImportPaths(".");

	const outputRelativeConfigPath = toPosixPath(
		path.relative(workerDir, project.configPath),
	);

	const processedArtifacts = await prepareBuildArtifacts({
		config: project.loaded.config,
		translationStore: project.loaded.translationStore,
		definition: project.loaded.definition,
		silent: true,
		configPath: project.configPath,
		outputPath: workerDir,
		outputRelativeConfigPath,
		customArtifactTypes: [astroConstants.workerArtifacts.exportType],
	});

	const mainWorkerSource = buildCloudflareMainWorkerSource({
		configArtifacts: configArtifactImports,
		customArtifacts: processedArtifacts.custom,
	});

	await Promise.all([
		fs.writeFile(
			path.join(workerDir, astroConstants.files.emailTemplatesJson),
			JSON.stringify(project.emailTemplates, null, 2),
		),
		fs.writeFile(
			path.join(workerDir, astroConstants.files.i18nTranslationsJson),
			JSON.stringify(project.loaded.translationStore.bundles, null, 2),
		),
		fs.writeFile(
			path.join(workerDir, astroConstants.files.worker),
			mainWorkerSource,
		),
	]);
};
