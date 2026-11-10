import { definePlugin } from "@lucidcms/core";
import type { LucidPlugin } from "@lucidcms/core/types";
import { PACKAGE_INFO, PLUGIN_KEY } from "./constants.js";
import createSeoBrick from "./services/create-seo-brick.js";
import resolvePluginOptions from "./services/plugin-options.js";
import registerAdminSlots from "./services/register-admin-slots.js";
import type { SeoPluginOptions } from "./types.js";

/** Adds SEO authoring fields and previews without changing document delivery or publishing. */
const plugin: LucidPlugin<SeoPluginOptions> = (options) =>
	definePlugin({
		key: PLUGIN_KEY,
		package: PACKAGE_INFO,
		sources: { translations: ["@lucidcms/seo/translations"] },
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
						siteUrl: options.siteUrl,
					}),
				);
			}
		},
	});
export default plugin;
