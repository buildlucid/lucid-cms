import { definePlugin, LucidError } from "@lucidcms/core";
import type { LucidPlugin } from "@lucidcms/core/types";
import { PACKAGE_INFO, PLUGIN_KEY } from "./constants.js";
import hookEvents from "./hook-events/index.js";
import createSendIndexNowJob from "./jobs/send-index-now.js";
import createSeoBrick from "./services/create-seo-brick.js";
import staticFilesHandler from "./services/hooks/static-files-handler.js";
import parsePluginOptions from "./services/parse-plugin-options.js";
import resolvePluginOptions from "./services/plugin-options.js";
import registerAdminSlots from "./services/register-admin-slots.js";
import registerIndexNow from "./services/register-index-now.js";
import registerRobots from "./services/register-robots.js";
import registerSitemap from "./services/register-sitemap.js";
import resolveSitemapEnvironment from "./services/sitemap/resolve-sitemap-environment.js";
import resolveSitemapTargets from "./services/sitemap/resolve-sitemap-targets.js";
import seoToolkit from "./toolkit/index.js";
import type { SeoPluginOptions } from "./types.js";

/**
 * Adds SEO authoring fields, previews, a sitemap, robots.txt and optional IndexNow sends without
 * changing document delivery or publishing.
 */
const plugin: LucidPlugin<SeoPluginOptions> = (given) => {
	const options = parsePluginOptions(given);
	const indexNowJob = createSendIndexNowJob(options);

	return definePlugin({
		key: PLUGIN_KEY,
		package: PACKAGE_INFO,
		toolkit: seoToolkit(options, indexNowJob),
		hookEvents,
		sources: { translations: ["@lucidcms/seo/translations"] },
		//* routing is only final once every plugin has configured, so named sitemap collections are checked here
		checkCompatibility: ({ config }) => {
			if (options.sitemap === false) return;
			const targets = resolveSitemapTargets(config, options);
			if (targets.error) throw new LucidError(targets.error);

			if (!options.indexNow) return;
			//* sends follow one environment, so it must be known before anything is published
			const environment = resolveSitemapEnvironment(
				config.collections,
				options.sitemap.environment,
			);
			if (environment.error) throw new LucidError(environment.error);
			const { deploy } = options.indexNow;
			if (
				deploy !== undefined &&
				!config.deploys.some((item) => item.key === deploy)
			) {
				throw new LucidError({
					scope: PLUGIN_KEY,
					message: `IndexNow deploy '${deploy}' isn't one of the config's deploys. Name the deploy that puts the site live, or leave out deploy to send on publish.`,
				});
			}
		},
		configure: (draft) => {
			const targets = resolvePluginOptions(options, draft.collections).map(
				(target) => ({ ...target, brick: createSeoBrick(target) }),
			);

			for (const { collection, brick, brickKey } of targets) {
				collection.config.bricks ??= {};
				collection.config.bricks.fixed ??= [];
				collection.config.bricks.fixed.push(brick);
				draft.admin.slots.push(
					...registerAdminSlots(collection.key, brickKey, {
						sitemap:
							options.sitemap !== false &&
							(options.sitemap.collections?.includes(collection.key) ?? true),
					}),
				);
			}

			if (options.sitemap !== false) registerSitemap(draft, options);
			if (options.robots !== false) registerRobots(draft, options);
			if (options.indexNow) {
				registerIndexNow(draft, options, options.indexNow, indexNowJob);
			}
			if (options.sitemap !== false || options.robots !== false) {
				//* optional, so projects without the site plugin start
				draft.hooks.push({
					service: "site",
					event: "staticFiles",
					optional: true,
					handler: staticFilesHandler(options),
				});
			}
		},
	});
};
export default plugin;
