export type CollectionPrefix = string | Record<string, string>;
export type CollectionUnique =
	| boolean
	| {
			/**
			 * Top-level field keys to include in fullSlug uniqueness checks.
			 * Documents only conflict when fullSlug and these field values match.
			 * Supported field types: text, textarea, select, number, datetime,
			 * relation, media, and user.
			 */
			fields?: string[];
	  };

export interface PluginOptions {
	collections: Array<{
		collectionKey: string;
		localized?: boolean;
		displayFullSlug?: boolean;
		prefix?: CollectionPrefix;
		unique?: CollectionUnique;
		// fallbackSlugSource?: string;
	}>;
}

export interface PluginOptionsInternal extends PluginOptions {
	collections: Array<CollectionConfig>;
}

export interface CollectionConfig {
	collectionKey: string;
	localized: boolean;
	displayFullSlug: boolean;
	prefix?: CollectionPrefix;
	unique: CollectionUnique;
	// fallbackSlugSource: string | undefined;
}

export type RouteUniqueValues = Record<string, Record<string, unknown>>;

export type ProjectedFullSlug = {
	documentId: number;
	versionId: number;
	fullSlugs: Record<string, string | null>;
	uniqueValues?: RouteUniqueValues;
};

export type RouteUniquenessItem = {
	documentId: number;
	versionId: number;
	locale: string;
	fullSlug: string;
	uniqueValues: Record<string, unknown>;
};

export type RouteUniquenessConflict = {
	locale: string;
	fullSlug: string;
};
