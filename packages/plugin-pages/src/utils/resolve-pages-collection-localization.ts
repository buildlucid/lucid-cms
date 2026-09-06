import type { CollectionBuilder } from "@lucidcms/core";
import { resolveCollectionLocalization } from "@lucidcms/core/extension";
import type { CollectionConfig } from "../types/types.js";

export type ResolvedPagesCollectionLocalization =
	| {
			enabled: true;
			locales: string[];
			defaultLocale: string;
			storageLocale: null;
	  }
	| {
			enabled: false;
			locales: [null];
			defaultLocale: null;
			storageLocale: null;
	  };

/** Resolves locale support for the collection and the plugin's slug fields. */
const resolvePagesCollectionLocalization = (props: {
	collection: CollectionConfig;
	collectionInstance: CollectionBuilder;
	localization: {
		locales: Array<{ code: string }>;
		defaultLocale: string | null;
	};
}): ResolvedPagesCollectionLocalization => {
	const collectionLocalization = resolveCollectionLocalization({
		localization: props.localization,
		collection: props.collectionInstance,
	});
	if (props.collection.localized && collectionLocalization.enabled) {
		return {
			enabled: true,
			locales: collectionLocalization.locales,
			defaultLocale: collectionLocalization.defaultLocale,
			storageLocale: null,
		};
	}
	return {
		enabled: false,
		locales: [null],
		defaultLocale: null,
		storageLocale: null,
	};
};

export default resolvePagesCollectionLocalization;
