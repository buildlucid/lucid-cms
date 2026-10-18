import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { LucidError } from "@lucidcms/core";
import type { LucidPluginCommand } from "@lucidcms/core/types";
import { KilnRenderError } from "@lucidkiln/core";
import { findRoute } from "rou3";
import {
	ASSETS_BASE,
	DEFAULT_STATIC_OUTPUT_DIRECTORY,
	errorPages,
	PLUGIN_KEY,
} from "../constants.js";
import { SiteNotFoundError, SiteRedirectError } from "../errors.js";
import createSiteLoader from "../services/create-site-loader.js";
import type { SiteState } from "../types.js";
import escapeHtml from "../utils/escape-html.js";
import getRouteParams from "../utils/get-route-params.js";
import normalizePath from "../utils/normalize-path.js";
import buildSiteData from "./build-site-data.js";
import collectPagePaths from "./collect-page-paths.js";
import findPageLinks from "./find-page-links.js";
import type { SiteCliOptions } from "./index.js";
import warnUnbuiltPages from "./warn-unbuilt-pages.js";

type BuildProps = Parameters<LucidPluginCommand["run"]>[0];

const CONCURRENCY = 8;

/** Refuses folders whose emptying would delete the project or its sources. */
const assertOutputFolder = (props: {
	outDir: string;
	projectRoot: string;
	siteRoot: string;
	publicFiles: BuildProps["publicFiles"];
}) => {
	const inside = (parent: string, child: string) => {
		const relative = path.relative(parent, child);
		return !relative.startsWith("..") && !path.isAbsolute(relative);
	};
	// The site folder is a source wherever the output sits relative to it; public files only when the output holds them.
	const touchesSources =
		inside(props.outDir, props.siteRoot) ||
		inside(props.siteRoot, props.outDir) ||
		props.publicFiles.some((file) => inside(props.outDir, file.path));

	if (
		props.outDir === props.projectRoot ||
		!inside(props.projectRoot, props.outDir) ||
		touchesSources
	) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `site:build empties '${props.outDir}' first, so it must be its own folder inside the project, apart from the site and public files.`,
		});
	}
};

const toFile = (outDir: string, routePath: string, contentType: string) =>
	contentType.startsWith("text/html")
		? path.join(outDir, routePath, "index.html")
		: path.join(outDir, routePath);

const write = async (outDir: string, file: string, content: string) => {
	if (!file.startsWith(`${outDir}${path.sep}`)) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `'${file}' is outside the build folder.`,
		});
	}
	await mkdir(path.dirname(file), { recursive: true });
	await writeFile(file, content);
};

const eachLimited = async <T>(items: T[], task: (item: T) => Promise<void>) => {
	const queue = [...items];
	await Promise.all(
		Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
			for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
				await task(item);
			}
		}),
	);
};

/** Builds templates, Vite files and static pages into a separate folder without requiring `lucidcms build` first. */
const buildSite = async (options: SiteCliOptions, props: BuildProps) => {
	const { config, context, toolkit, logger, projectRoot } = props;
	if (options.mode !== "static") {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message:
				"site:build only builds static sites. Set the site plugin's mode to 'static'.",
		});
	}
	const outDir = path.resolve(
		projectRoot,
		options.static?.outDir ?? DEFAULT_STATIC_OUTPUT_DIRECTORY,
	);
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
			.filter((file) => !file.name.startsWith("_plugins/"))
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
	const site = await createSiteLoader(
		options,
		config,
	)({
		reload: false,
		context,
		data,
	});
	const state = (routePath: string): SiteState => ({
		toolkit,
		path: routePath,
		preview: null,
		version: site.functions.getVersion,
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
	await eachLimited(paths, async (routePath) => {
		const match = findRoute(site.router, "GET", routePath);
		if (!match) {
			logger.warn(`Skipped ${routePath}, which no page routes to`);
			return;
		}

		try {
			const body = await site.freshKiln.render(
				match.data.template,
				{ route: { path: routePath, params: getRouteParams(match) } },
				{ state: state(routePath) },
			);
			await write(
				outDir,
				toFile(outDir, routePath, match.data.contentType),
				body,
			);
			built.add(routePath);
			if (match.data.contentType.startsWith("text/html")) {
				for (const link of findPageLinks(body)) {
					if (!links.has(link)) links.set(link, routePath);
				}
			}
		} catch (error) {
			const cause = error instanceof KilnRenderError ? error.cause : error;
			if (cause instanceof SiteNotFoundError) {
				logger.warn(`Skipped ${routePath}, which called notFound()`);
				return;
			}
			if (cause instanceof SiteRedirectError) {
				const location = escapeHtml(cause.location);
				await write(
					outDir,
					toFile(outDir, routePath, "text/html"),
					`<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${location}"><link rel="canonical" href="${location}"><a href="${location}">${location}</a>`,
				);
				built.add(routePath);
				return;
			}
			failures.push({ path: routePath, error });
		}
	});

	if (site.templates.has(errorPages.notFound)) {
		const body = await site.freshKiln.render(
			errorPages.notFound,
			{ route: { path: "/404", params: {} } },
			{ state: state("/404") },
		);
		await write(outDir, path.join(outDir, "404.html"), body);
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
