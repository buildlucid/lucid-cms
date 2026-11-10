import { type CollectionBuilder, LucidError } from "@lucidcms/core";
import type { ResolvedLucidConfig } from "@lucidcms/core/types";
import clearPathHistoryConfig from "../../admin/components/ClearPathHistory/config.js";
import { PLUGIN_KEY, REDIRECTS_COLLECTION_KEY } from "../../constants.js";
import createClearPathHistoryJob from "../../jobs/clear-path-history.js";
import clearPathHistoryRoute from "../../routes/clear-path-history.js";
import previousPathsRoutes from "../../routes/previous-paths.js";
import type {
	CollectionConfig,
	PluginOptionsInternal,
	RedirectsOptionsInternal,
} from "../../types/types.js";
import resolvePagesCollectionLocalization from "../../utils/resolve-pages-collection-localization.js";
import {
	redirectBeforeUpsertHandler,
	redirectVersionPromoteHandler,
} from "../hooks/index.js";
import createRedirectResolver from "./create-redirect-resolver.js";
import createRedirectsCollection from "./create-redirects-collection.js";
import resolveRedirectsConfig from "./resolve-redirects-config.js";

/**
 * Adds the redirects collection, its resolver and save checks once the pages collections are known.
 * When path changes are tracked, also adds the previous paths routes and the Clear Previous Paths
 * job, route and tile.
 */
const registerRedirects = (props: {
	draft: ResolvedLucidConfig;
	options: PluginOptionsInternal;
	redirects: RedirectsOptionsInternal;
	collections: Array<{
		collectionConfig: CollectionConfig;
		collectionInstance: CollectionBuilder;
	}>;
}) => {
	const { draft } = props;
	if (
		draft.collections.some(
			(collection) => collection.key === REDIRECTS_COLLECTION_KEY,
		)
	) {
		throw new LucidError({
			scope: PLUGIN_KEY,
			message: `Collection key '${REDIRECTS_COLLECTION_KEY}' is reserved for the pages plugin's redirects. Rename the collection or set 'redirects: false'.`,
		});
	}

	const config = resolveRedirectsConfig(
		props.redirects,
		draft.localization,
		props.collections.map(({ collectionConfig, collectionInstance }) => ({
			key: collectionInstance.key,
			environments: collectionInstance.config.publishing?.environments,
			localized: resolvePagesCollectionLocalization({
				localization: draft.localization,
				collection: collectionConfig,
				collectionInstance,
			}).enabled,
		})),
	);
	draft.collections.push(createRedirectsCollection(config));
	draft.redirects.push(createRedirectResolver(config));
	draft.hooks.push(
		{
			service: "documents",
			event: "beforeUpsert",
			handler: redirectBeforeUpsertHandler(config),
		},
		{
			service: "documents",
			event: "afterVersionPromote",
			handler: redirectVersionPromoteHandler(config),
		},
	);

	if (config.trackPathChanges) {
		const clearPathHistoryJob = createClearPathHistoryJob(props.options);
		draft.jobs.definitions.push(clearPathHistoryJob);
		draft.http.routes.push(
			...previousPathsRoutes(config.collections),
			clearPathHistoryRoute(clearPathHistoryJob),
		);
		draft.admin.slots.push(clearPathHistoryConfig());
	}
};

export default registerRedirects;
