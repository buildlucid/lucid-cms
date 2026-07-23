import type { FieldWidth } from "@lucidcms/core/types";

export type CollectionPrefix = string | Record<string, string>;
export type PagesFieldKey = "fullSlug" | "slug" | "parentPage";
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

export interface CollectionUI {
	fullSlug?: boolean;
	tab?: string;
	widths?: Partial<Record<PagesFieldKey, FieldWidth>>;
}

export interface PluginOptions {
	collections: Array<{
		collection: string;
		localized?: boolean;
		prefix?: CollectionPrefix;
		ui?: CollectionUI;
		unique?: CollectionUnique;
		// fallbackSlugSource?: string;
	}>;
}

export interface PluginOptionsInternal {
	collections: Array<CollectionConfig>;
}

export interface CollectionConfig {
	collection: string;
	localized: boolean;
	prefix?: CollectionPrefix;
	ui: {
		fullSlug: boolean;
		tab?: string;
		widths: Record<PagesFieldKey, FieldWidth>;
	};
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
