import { LucidError } from "@lucidcms/core";
import type { LucidPlugin } from "@lucidcms/core/types";
import { COLLECTION_KEY, LUCID_VERSION, PLUGIN_KEY } from "./constants.js";
import createRedirectsCollection from "./services/create-collection.js";
import {
	beforeUpsertHandler,
	versionPromoteHandler,
} from "./services/hooks/index.js";
import resolvePluginOptions from "./services/plugin-options.js";
import type { RedirectsPluginOptions } from "./types.js";

const plugin: LucidPlugin<RedirectsPluginOptions> = (givenOptions) => ({
	key: PLUGIN_KEY,
	lucid: LUCID_VERSION,
	recipe: (draft) => {
		if (
			draft.collections.some((collection) => collection.key === COLLECTION_KEY)
		) {
			throw new LucidError({
				scope: PLUGIN_KEY,
				message: `Collection key '${COLLECTION_KEY}' is reserved by the redirects plugin.`,
			});
		}

		const options = resolvePluginOptions(
			givenOptions,
			draft.localization,
			draft.collections.map((collection) => ({
				key: collection.key,
				environments: collection.config.environments,
			})),
		);

		draft.i18n.sources.push("@lucidcms/plugin-redirects/translations");
		draft.collections.push(createRedirectsCollection(options));
		draft.hooks.push({
			service: "documents",
			event: "beforeUpsert",
			handler: beforeUpsertHandler(options),
		});
		draft.hooks.push({
			service: "documents",
			event: "versionPromote",
			handler: versionPromoteHandler(options),
		});
	},
});

export default plugin;
