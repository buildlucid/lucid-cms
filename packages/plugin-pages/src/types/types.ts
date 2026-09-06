import type { FieldWidth } from "@lucidcms/core/types";

/** A shared URL prefix or prefixes keyed by content locale. */
export type CollectionPrefix = string | Record<string, string>;
export type PagesFieldKey = "fullSlug" | "slug" | "parentPage" | "segments";

/** Place generated fields at the start or end of a tab, or before or after an existing field. */
export type PagesFieldPlacement =
	| {
			at: "start" | "end";
			tab?: string;
			before?: never;
			after?: never;
	  }
	| {
			before: string;
			at?: never;
			tab?: never;
			after?: never;
	  }
	| {
			after: string;
			at?: never;
			tab?: never;
			before?: never;
	  };

export type CollectionRouteSegment = {
	/** Relation field key registered on the pages collection. */
	relation: string;
	/** Collection selected by the generated relation field. */
	collection: string;
	/** Top-level scalar field read from the related document. */
	field: string;
};

/** Placement and layout of generated route fields. */
export interface CollectionUI {
	/** Show the computed full path to editors. Defaults to false. */
	fullSlug?: boolean;
	/** Where to insert generated fields. Defaults to the end. */
	placement?: PagesFieldPlacement;
	/** Widths for generated fields on the 12-column editor grid. */
	widths?: Partial<Record<PagesFieldKey, FieldWidth>>;
}

/** Collections that should receive page routing fields. */
export interface PluginOptions {
	/** Collection-specific routing options. */
	collections: Array<{
		/** Key of an existing collection. */
		key: string;
		/** Use localized slugs. Defaults to false. */
		localized?: boolean;
		/** Static path prefix, shared or keyed by locale. */
		prefix?: CollectionPrefix;
		/** Related-document fields to include as route segments, in order. */
		segments?: CollectionRouteSegment[];
		/** Editor layout for generated fields. */
		ui?: CollectionUI;
		/** Reject conflicting full paths. Defaults to true. */
		unique?: boolean;
		// fallbackSlugSource?: string;
	}>;
}

export interface PluginOptionsInternal {
	collections: Array<CollectionConfig>;
}

export interface CollectionConfig {
	key: string;
	localized: boolean;
	prefix?: CollectionPrefix;
	segments: CollectionRouteSegment[];
	ui: {
		fullSlug: boolean;
		placement: PagesFieldPlacement;
		widths: Record<PagesFieldKey, FieldWidth>;
	};
	unique: boolean;
	// fallbackSlugSource: string | undefined;
}

export type ProjectedFullSlug = {
	documentId: number;
	versionId: number;
	fullSlugs: Record<string, string | null>;
};

export type RouteUniquenessItem = {
	documentId: number;
	versionId: number;
	locale: string;
	fullSlug: string;
};

export type RouteUniquenessConflict = {
	locale: string;
	fullSlug: string;
};

export type RouteSegmentSelection = {
	sourceKey: string;
	index: number;
	collectionKey?: string;
	documentId?: number;
};

export type RouteSegmentTarget = {
	sourceKey: string;
	index: number;
	relation: string;
	field: string;
	collectionKey: string;
	documentId: number;
	localized: boolean;
	storageLocale: string;
};
