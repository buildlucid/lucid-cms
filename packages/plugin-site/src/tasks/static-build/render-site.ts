import { definePluginTask, z } from "@lucidcms/core";
import { errorPages } from "../../constants.js";
import createSiteLoader from "../../site/create-site-loader.js";
import renderOptions from "../../site/render-options.js";
import type {
	BuiltSiteData,
	SitePluginOptionsInternal,
	SiteState,
} from "../../types.js";
import eachLimited from "../../utils/each-limited.js";
import isRecord from "../../utils/is-record.js";
import collectPagePaths from "./collect-page-paths.js";
import renderStaticPage, { type StaticFile } from "./render-static-page.js";
import warnUnbuiltPages from "./warn-unbuilt-pages.js";

const CONCURRENCY = 8;

/** What the `build` task hands back to `site:build`, which writes it out and reports it. */
export type StaticBuild = {
	files: StaticFile[];
	/** How many paths the pages' `paths` exports listed. */
	total: number;
	/** Paths that made no file, with the reason. */
	skipped: string[];
	failures: Array<{ path: string; message: string; stack?: string }>;
	warnings: Array<{ message: string; details?: string[] }>;
};

const inputSchema = z.object({
	/** The production client build's asset data, which pages link to. */
	data: z.custom<BuiltSiteData>(
		(value) => isRecord(value) && value.kind === "build",
	),
	/** Public file paths, which links may point to without a page. */
	publicPaths: z.array(z.string()),
});

/** Runs the `build` task for `site:build`, rendering every listed static page inside the runtime with database access and assets from its client build. */
const renderSite = (options: SitePluginOptionsInternal) =>
	definePluginTask({
		input: inputSchema,
		run: async ({ context, toolkit, input }): Promise<StaticBuild> => {
			const { data, publicPaths } = input;
			const site = await createSiteLoader(
				options,
				context.config,
			)({
				context,
				data,
			});

			// Static builds have no request, so the locale option only sees the path.
			const state = (routePath: string): SiteState => ({
				toolkit,
				context,
				path: routePath,
				locale: site.config.resolveLocale({
					path: routePath,
					url: null,
					header: () => null,
					cookie: () => undefined,
				}),
				preview: null,
				version: site.config.getVersion,
			});

			const warnings: StaticBuild["warnings"] = [];
			const warn = (message: string, details?: string[]) => {
				warnings.push({ message, details });
			};

			// Exports run before any page renders, so there is no request path.
			const paths = await collectPagePaths({ site, state: state(""), warn });
			const files: StaticFile[] = [];
			const failures: StaticBuild["failures"] = [];
			const built = new Set<string>();
			const skipped: string[] = [];
			const links = new Map<string, string>();

			await eachLimited(paths, CONCURRENCY, async (routePath) => {
				try {
					const page = await renderStaticPage({
						site,
						routePath,
						state: state(routePath),
					});
					if (!page.written) {
						skipped.push(`${routePath} (${page.reason})`);
						return;
					}

					files.push(page.file);
					built.add(routePath);

					for (const link of page.links) {
						if (!links.has(link)) links.set(link, routePath);
					}
				} catch (error) {
					failures.push(
						error instanceof Error
							? { path: routePath, message: error.message, stack: error.stack }
							: { path: routePath, message: String(error) },
					);
				}
			});

			if (site.templates.has(errorPages.notFound)) {
				const body = await site.freshKiln.render(
					errorPages.notFound,
					{ route: { path: "/404", params: {} } },
					renderOptions(state("/404")),
				);
				files.push({ path: "/404.html", body: site.finishPage(body) });
			}

			if (failures.length === 0) {
				await warnUnbuiltPages({
					site,
					toolkit,
					collections: context.config.collections.map(
						(collection) => collection.key,
					),
					built,
					links,
					publicPaths: new Set(publicPaths),
					warn,
				});
			}

			return {
				files,
				total: paths.length,
				skipped: skipped.sort(),
				failures,
				warnings,
			};
		},
	});

/** The `build` task, whose type `site:build` passes to `runTask`. */
export type RenderSiteTask = ReturnType<typeof renderSite>;

export default renderSite;
