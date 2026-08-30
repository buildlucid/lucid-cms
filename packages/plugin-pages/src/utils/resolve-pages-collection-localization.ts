import type { CollectionBuilder } from "@lucidcms/core";
import { resolveCollectionLocalization } from "@lucidcms/core/extension";
import type { CollectionConfig } from "../types/types.js";

export type ResolvedPagesCollectionLocalization = Pick<
	ReturnType<typeof resolveCollectionLocalization>,
	"enabled" | "locales" | "defaultLocale" | "storageLocale"
>;

/** Resolves locale support for the collection and the plugin's slug fields. */
const resolvePagesCollectionLocalization = (props: {
	collection: CollectionConfig;
	collectionInstance: CollectionBuilder;
	localization: {
		locales: Array<{ code: string }>;
		defaultLocale: string;
	};
}): ResolvedPagesCollectionLocalization => {
	const collectionLocalization = resolveCollectionLocalization({
		localization: props.localization,
		collection: props.collectionInstance,
	});
	const enabled = props.collection.localized && collectionLocalization.enabled;

	return {
		enabled,
		locales: enabled
			? collectionLocalization.locales
			: [collectionLocalization.storageLocale],
		defaultLocale: enabled
			? collectionLocalization.defaultLocale
			: collectionLocalization.storageLocale,
		storageLocale: collectionLocalization.storageLocale,
	};
};

export default resolvePagesCollectionLocalization;
