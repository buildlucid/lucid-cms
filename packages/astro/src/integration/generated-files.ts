import fs from "node:fs/promises";
import path from "node:path";
import { prepareBuildArtifacts } from "@lucidcms/core/build";
import astroConstants from "../constants.js";
import {
	buildCloudflareAdminBarMiddlewareSource,
	buildLucidAdminBarDevToolbarAppSource,
	buildNodeAdminBarMiddlewareSource,
} from "../internal/admin-bar/generated-sources.js";
import {
	buildCloudflareRouteSource,
	buildCloudflareToolkitSource,
	buildNodeRouteSource,
	buildNodeToolkitSource,
} from "../internal/generated-sources.js";
import { toImportPath, toPosixPath } from "../internal/paths.js";
import { buildCloudflareMainWorkerSource } from "../internal/worker-module.js";
import type { LucidAstroAdminBarOptions } from "../types.js";
import { ensureDirectory } from "./filesystem.js";
import type { ResolvedLucidProject } from "./project.js";

/**
 * Astro routes need generated modules because Lucid's config, rendered email
 * templates and SPA shell all live outside Astro's normal source ownership.
 */
export const writeGeneratedRouteFiles = async (props: {
	project: ResolvedLucidProject;
	codegenDir: string;
	adminBar: Required<LucidAstroAdminBarOptions>;
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
	const toolkitModulePath = path.join(
		props.codegenDir,
		astroConstants.files.toolkitModule,
	);
	const middlewareModulePath = path.join(
		props.codegenDir,
		astroConstants.files.middlewareModule,
	);
	const devToolbarAppModulePath = path.join(
		props.codegenDir,
		astroConstants.files.devToolbarAppModule,
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
			? buildNodeRouteSource(
					configImportPath,
					props.project.loaded.definition.adapter.module,
					props.project.loaded.definition.database.module,
				)
			: buildCloudflareRouteSource(
					configImportPath,
					props.project.loaded.definition.database.module,
				);
	const toolkitSource =
		props.project.runtime === "node"
			? buildNodeToolkitSource(
					configImportPath,
					props.project.loaded.definition.adapter.module,
					props.project.loaded.definition.database.module,
				)
			: buildCloudflareToolkitSource(
					configImportPath,
					props.project.loaded.definition.database.module,
				);
	const middlewareSource =
		props.project.runtime === "node"
			? buildNodeAdminBarMiddlewareSource(
					configImportPath,
					props.project.loaded.definition.adapter.module,
					props.project.loaded.definition.database.module,
					props.adminBar,
				)
			: buildCloudflareAdminBarMiddlewareSource(
					configImportPath,
					props.project.loaded.definition.database.module,
					props.adminBar,
				);
	const devToolbarAppSource = buildLucidAdminBarDevToolbarAppSource();

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
		fs.writeFile(toolkitModulePath, toolkitSource),
		fs.writeFile(middlewareModulePath, middlewareSource),
		fs.writeFile(devToolbarAppModulePath, devToolbarAppSource),
		fs.writeFile(routePath, routeSource),
	]);

	return {
		routePath,
		middlewarePath: middlewareModulePath,
		devToolbarAppPath: devToolbarAppModulePath,
	};
};

/**
 * Astro's Cloudflare hosting uses a single Lucid-owned worker entry that
 * layers Lucid hooks onto Astro's generated server worker.
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
		definition: project.loaded.definition,
		silent: true,
		configPath: project.configPath,
		outputPath: workerDir,
		outputRelativeConfigPath,
		customArtifactTypes: [astroConstants.workerArtifacts.exportType],
	});

	const mainWorkerSource = buildCloudflareMainWorkerSource({
		configImportPath: outputRelativeConfigPath,
		databaseAdapterImportPath: project.loaded.definition.database.module,
		customArtifacts: processedArtifacts.custom,
	});

	await Promise.all([
		fs.writeFile(
			path.join(workerDir, astroConstants.files.emailTemplatesJson),
			JSON.stringify(project.emailTemplates, null, 2),
		),
		fs.writeFile(
			path.join(workerDir, astroConstants.files.worker),
			mainWorkerSource,
		),
	]);
};
