import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { LucidAPIError, LucidError } from "@lucidcms/core";
import type { LucidPluginCommand, Toolkit } from "@lucidcms/core/types";
import { KilnRenderError } from "@lucidkiln/core";
import { findRoute } from "rou3";
import {
	ASSETS_BASE,
	errorPages,
	PLUGIN_KEY,
	STATIC_OUTPUT_DIRECTORY,
} from "../constants.js";
import { SiteNotFoundError, SiteRedirectError } from "../errors.js";
import type { SitePluginOptions, SiteState } from "../types.js";
import escapeHtml from "../utils/escape-html.js";
import getRouteParams from "../utils/get-route-params.js";
import createSiteLoader, { type Site } from "./create-site-loader.js";

type BuildProps = Parameters<LucidPluginCommand["run"]>[0];

const CONCURRENCY = 8;

const listDocumentPaths = async (
	site: Site,
	toolkit: Toolkit,
	collectionKey: string,
) => {
	const version = site.functions.getVersion(collectionKey);
	if (version === null) return [];

	const response = await toolkit.documents.getMultiple({
		collectionKey,
		version,
		query: { perPage: -1 },
	});
	if (response.error) throw new LucidAPIError(response.error);

	return response.data.data.flatMap((document) => {
		const routePath = document.route?.path;
		if (typeof routePath === "string") return [routePath];
		if (typeof routePath === "object" && routePath !== null) {
			return Object.values(routePath).filter(
				(value): value is string => typeof value === "string",
			);
		}
		return [];
	});
};

const collectPaths = async (site: Site, toolkit: Toolkit) => {
	const missing = site.pages.filter(
		(page) => /[:*]/.test(page.pattern) && !page.route.paths,
	);
	if (missing.length > 0) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `These dynamic pages need 'paths' in their route to build: ${missing.map((page) => page.name).join(", ")}.`,
		});
	}

	const paths = await Promise.all(
		site.pages.map(async (page) => {
			if (!/[:*]/.test(page.pattern)) return [page.pattern];
			return (
				(await page.route.paths?.({
					toolkit,
					documentPaths: (collectionKey) =>
						listDocumentPaths(site, toolkit, collectionKey),
				})) ?? []
			);
		}),
	);
	return [...new Set(paths.flat())];
};

/** Copies the files `lucidcms build` built for `vite()` from the public folder into the static site. */
const copyAssets = async (site: Site, buildDir: string, outDir: string) => {
	if (site.data?.mode !== "build" || !site.data.manifest) return;

	const files = new Set(
		Object.values(site.data.manifest).flatMap((chunk) => [
			chunk.file,
			...(chunk.css ?? []),
			...(chunk.assets ?? []),
		]),
	);
	await Promise.all(
		[...files].map(async (file) => {
			const target = path.join(outDir, ASSETS_BASE, file);
			await mkdir(path.dirname(target), { recursive: true });
			await copyFile(path.join(buildDir, "public", ASSETS_BASE, file), target);
		}),
	);
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

const buildSite = async (options: SitePluginOptions, props: BuildProps) => {
	const { config, context, toolkit, logger } = props;
	if (options.mode !== "static") {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message:
				"site:build only builds static sites. Set the site plugin's mode to 'static'.",
		});
	}
	const outDir = path.resolve(config.build.outDir, STATIC_OUTPUT_DIRECTORY);

	await Promise.all(
		props.publicFiles
			.filter((file) => !file.name.startsWith("_plugins/"))
			.map(async (file) => {
				const target = path.join(outDir, file.name);
				await mkdir(path.dirname(target), { recursive: true });
				await copyFile(file.path, target);
			}),
	);

	const site = await createSiteLoader(
		options,
		config,
	)({
		reload: false,
		context,
	});
	await copyAssets(site, path.resolve(config.build.outDir), outDir);
	const paths = await collectPaths(site, toolkit);
	const state = (routePath: string): SiteState => ({
		toolkit,
		path: routePath,
		preview: null,
		version: site.functions.getVersion,
	});

	const failures: Array<{ path: string; error: unknown }> = [];
	let built = 0;
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
			built++;
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
				built++;
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

	logger.info(
		`Built ${built} pages to ${path.relative(process.cwd(), outDir) || "."}`,
	);
};

export default buildSite;
