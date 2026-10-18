import { copyFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { LucidError } from "@lucidcms/core";
import { pluginPublicDirectory } from "@lucidcms/core/extension";
import type { LucidPluginCommand } from "@lucidcms/core/types";
import { ASSETS_BASE, errorPages, PLUGIN_KEY } from "../../constants.js";
import createSiteLoader from "../../site/create-site-loader.js";
import type { SitePluginOptionsInternal, SiteState } from "../../types.js";
import eachLimited from "../../utils/each-limited.js";
import normalizePath from "../../utils/normalize-path.js";
import buildSiteData from "../build-site-data.js";
import assertOutputFolder from "./assert-output-folder.js";
import collectPagePaths from "./collect-page-paths.js";
import renderStaticPage from "./render-static-page.js";
import warnUnbuiltPages from "./warn-unbuilt-pages.js";
import writeStaticFile from "./write-static-file.js";

type BuildProps = Parameters<LucidPluginCommand["run"]>[0];

const CONCURRENCY = 8;

/** Builds templates, Vite files and static pages into a separate folder without requiring `lucidcms build` first. */
const buildSite = async (
	options: SitePluginOptionsInternal,
	props: BuildProps,
) => {
	const { config, context, toolkit, logger, projectRoot } = props;
	if (options.mode !== "static") {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message:
				"site:build only builds static sites. Set the site plugin's mode to 'static'.",
		});
	}
	const outDir = path.resolve(projectRoot, options.static.outDir);
	const siteRoot = path.resolve(projectRoot, options.directory);
	assertOutputFolder({
		outDir,
		projectRoot,
		siteRoot,
		publicFiles: props.publicFiles,
	});
	await rm(outDir, { recursive: true, force: true });

	await Promise.all(
		props.publicFiles
			.filter((file) => !file.name.startsWith(`${pluginPublicDirectory}/`))
			.map(async (file) => {
				const target = path.join(outDir, file.name);
				await mkdir(path.dirname(target), { recursive: true });
				await copyFile(file.path, target);
			}),
	);

	const data = await buildSiteData({
		root: siteRoot,
		projectRoot,
		publicFiles: props.publicFiles,
		assetsDir: path.join(outDir, ASSETS_BASE),
	});
	const site = await createSiteLoader(options, config)({ context, data });
	const state = (routePath: string): SiteState => ({
		toolkit,
		path: routePath,
		preview: null,
		version: site.config.getVersion,
	});
	// Exports run before any page renders, so there is no request path.
	const paths = await collectPagePaths({
		site,
		state: state(""),
		warn: (message) => logger.warn(message),
	});

	const failures: Array<{ path: string; error: unknown }> = [];
	const built = new Set<string>();
	const links = new Map<string, string>();
	await eachLimited(paths, CONCURRENCY, async (routePath) => {
		try {
			const page = await renderStaticPage({
				site,
				outDir,
				routePath,
				state: state(routePath),
				warn: (message) => logger.warn(message),
			});
			if (page.written) built.add(routePath);
			for (const link of page.links) {
				if (!links.has(link)) links.set(link, routePath);
			}
		} catch (error) {
			failures.push({ path: routePath, error });
		}
	});

	if (site.templates.has(errorPages.notFound)) {
		const body = await site.freshKiln.render(
			errorPages.notFound,
			{ route: { path: "/404", params: {} } },
			{ state: state("/404") },
		);
		await writeStaticFile(outDir, "404.html", body);
	}

	for (const failure of failures) {
		logger.error(failure.error, `Failed to render ${failure.path}`);
	}
	if (failures.length > 0) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `${failures.length} of ${paths.length} pages failed to render.`,
		});
	}

	await warnUnbuiltPages({
		site,
		toolkit,
		collections: config.collections.map((collection) => collection.key),
		built,
		links,
		publicPaths: new Set(
			props.publicFiles.map((file) => normalizePath(`/${file.name}`)),
		),
		warn: (message) => logger.warn(message),
	});

	logger.info(
		`Built ${built.size} pages to ${path.relative(process.cwd(), outDir) || "."}`,
	);
};

export default buildSite;
