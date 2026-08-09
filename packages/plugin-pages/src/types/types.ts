import type { FieldWidth } from "@lucidcms/core/types";

export type CollectionPrefix = string | Record<string, string>;
export type PagesFieldKey = "fullSlug" | "slug" | "parentPage" | "segments";

export type CollectionRouteSegment = {
	/** Relation field key registered on the pages collection. */
	relation: string;
	/** Collection selected by the generated relation field. */
	collection: string;
	/** Top-level scalar field read from the related document. */
	field: string;
};

export interface CollectionUI {
	fullSlug?: boolean;
	tab?: string;
	widths?: Partial<Record<PagesFieldKey, FieldWidth>>;
}

export interface PluginOptions {
	collections: Array<{
		key: string;
		localized?: boolean;
		prefix?: CollectionPrefix;
		segments?: CollectionRouteSegment[];
		ui?: CollectionUI;
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
		tab?: string;
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
};
