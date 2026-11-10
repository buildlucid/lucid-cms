import type {
	CollectionEnvironmentOptions,
	DocumentVersionType,
	FieldPlacement,
	FieldWidth,
} from "@lucidcms/core/types";

/** A shared URL prefix or prefixes keyed by content locale. */
export type CollectionPrefix = string | Record<string, string>;
export type PagesFieldKey = "slug" | "parentPage" | "segments";

/** Place generated fields at the start or end of a tab, or before or after an existing field. */
export type PagesFieldPlacement = FieldPlacement;

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
	/** Where to insert generated fields. Defaults to the end. */
	placement?: PagesFieldPlacement;
	/** Widths for generated fields on the 12-column editor grid. */
	widths?: Partial<Record<PagesFieldKey, FieldWidth>>;
}

/** The redirects collection and automatic redirects for pages whose paths change. */
export interface RedirectsOptions {
	/**
	 * Remember a page's old paths when they change in a published environment, so visitors and
	 * search engines are sent to its current path. Defaults to true.
	 */
	trackPathChanges?: boolean;
	/** Admin navigation group key for the redirects collection. Defaults to `redirects`. */
	navigationGroup?: string;
	/** Redirect environments. Defaults to every pages collection's environments, merged. */
	environments?: CollectionEnvironmentOptions[];
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
		/** Reject conflicting paths. Defaults to true. */
		unique?: boolean;
	}>;
	/**
	 * Adds a redirects collection for sending old addresses to pages or other websites, and
	 * redirects pages' old paths to their current ones. `false` turns both off. Defaults to true.
	 */
	redirects?: boolean | RedirectsOptions;
}

export interface PluginOptionsInternal {
	collections: Array<CollectionConfig>;
	redirects: false | RedirectsOptionsInternal;
}

export type RedirectsOptionsInternal = Omit<
	RedirectsOptions,
	"trackPathChanges"
> & {
	trackPathChanges: boolean;
};

/** A pages collection redirects can point at, and whether its paths differ per locale. */
export type RedirectTargetCollection = {
	key: string;
	localized: boolean;
};

/** Redirects settings once the collections and locales they depend on are known. */
export type RedirectsConfig = {
	/** Pages collections redirects can point at. */
	collections: RedirectTargetCollection[];
	environments: CollectionEnvironmentOptions[];
	navigationGroup?: string;
	locales: Array<{ code: string; label: string }>;
	defaultLocale: string | null;
	/** Redirects pick a language when the site has more than one. */
	hasLocaleField: boolean;
	/** Pages' old paths redirect to their current ones. */
	trackPathChanges: boolean;
};

/** The values a redirect's integrity checks compare: its source, language and target. */
export type RedirectIdentity = {
	from: string;
	locale: string | null;
	targetType: "document" | "url";
	targetUrl: string | null;
};

export interface CollectionConfig {
	key: string;
	localized: boolean;
	prefix?: CollectionPrefix;
	segments: CollectionRouteSegment[];
	ui: {
		placement: PagesFieldPlacement;
		widths: Record<PagesFieldKey, FieldWidth>;
	};
	unique: boolean;
	/** Record the collection's old published paths, so they redirect to current ones. */
	trackPaths: boolean;
}

/**
 * Version scopes read and rewrite one version per document. Request scopes rewrite captured
 * versions only; other documents use the read-only fallback version.
 */
export type RouteScope =
	| {
			type: "version";
			versionType: Exclude<DocumentVersionType, "revision">;
	  }
	| {
			type: "request";
			versions: Map<number, number>;
			fallback: Exclude<DocumentVersionType, "revision">;
	  };

/** A page version's computed route per locale, ready to check and write. */
export type ProjectedPath = {
	documentId: number;
	versionId: number;
	values: Map<string | null, string | null>;
};

export type RouteUniquenessItem = {
	documentId: number;
	versionId: number;
	locale: string | null;
	path: string;
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
	storageLocale: null;
};
