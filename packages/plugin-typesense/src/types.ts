import type {
	CollectionDocument,
	CollectionDocumentMultipleInclude,
	Media,
	Refs,
} from "@lucidcms/core/types";
import type { Client } from "typesense";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections.js";
import type { ConfigurationOptions } from "typesense/lib/Typesense/Configuration.js";

export type IndexValue =
	| string
	| number
	| boolean
	| null
	| readonly IndexValue[]
	| { readonly [key: string]: IndexValue | undefined };

/** A projected record. IDs are namespaced by source, item and locale. */
export type IndexRecord = {
	readonly id?: string;
	readonly [key: string]: IndexValue | undefined;
};

export type ProjectionContext = {
	/** Values formatted by Lucid's custom fields, including nested content. */
	readonly document: CollectionDocument<string>;
	/** The configured locale, or null when indexing all translations together. */
	readonly locale: string | null;
	readonly refs: Refs;
};

/** Input values are validated as JSON before being sent to Typesense. */
type ProjectedRecord = {
	readonly id?: string;
	readonly [key: string]: unknown;
};

type Projection<Input, Field extends string = string> = {
	/** Return false to remove this resource's records for the current locale. */
	readonly condition?: (input: Input) => boolean;
} & (
	| {
			readonly fields: Readonly<
				Record<string, Field | ((input: Input) => unknown)>
			>;
			readonly project?: never;
	  }
	| {
			readonly fields?: never;
			/** Return null to exclude an item. Multiple records need stable IDs. */
			readonly project: (
				input: Input,
			) => ProjectedRecord | readonly ProjectedRecord[] | null;
	  }
);

/** Reads current collection content. Return null or [] to exclude a document. */
export type CollectionSource = {
	readonly kind: "collection";
	readonly key: string;
	readonly collection: string;
	/** "latest" or a configured publication target such as "published". */
	readonly version: string;
	/** One record set per locale. Omit to project all translations together. */
	readonly locales?: readonly string[];
	readonly include?: readonly Exclude<
		CollectionDocumentMultipleInclude,
		"refs"
	>[];
	/** Extra dependencies read by project. Included references are tracked automatically. */
	readonly dependencies?: {
		readonly collections?: readonly string[];
		readonly media?: boolean;
	};
} & Projection<ProjectionContext>;

export type MediaProjectionContext = {
	/** Formatted media, including its current delivery URL, crop and translations. */
	readonly media: Media;
	readonly locale: string | null;
};

export type MediaSource = {
	readonly kind: "media";
	readonly key: string;
	readonly locales?: readonly string[];
	/** Defaults to public. Use all only for an index behind appropriate access controls. */
	readonly visibility?: "public" | "all";
} & Projection<
	MediaProjectionContext,
	keyof Media | "alt" | "description" | "summary"
>;

/** Sources currently supported by this plugin. */
export type IndexSource = CollectionSource | MediaSource;

export type IndexOptions = {
	readonly key: string;
	/** Dedicated Typesense alias owned by this plugin. Consumers query this name. */
	readonly alias: string;
	/** Schema and settings for each replacement collection. Rebuild after changing these. */
	readonly schema: Omit<CollectionCreateSchema, "name">;
	readonly sources: readonly IndexSource[];
};

type ConnectionOptions =
	| {
			/** Use an existing server-side Typesense SDK client. */
			readonly client: Client;
			readonly host?: never;
			readonly apiKey?: never;
			readonly clientOptions?: never;
	  }
	| {
			readonly client?: never;
			/** Typesense URL, including the port when needed. Hostnames default to HTTPS. */
			readonly host: string;
			readonly apiKey: string;
			readonly clientOptions?: Pick<
				ConfigurationOptions,
				"connectionTimeoutSeconds" | "numRetries" | "retryIntervalSeconds"
			>;
	  };

export type PluginOptions = ConnectionOptions & {
	readonly indexes: readonly IndexOptions[];
	/** Source items read in one job. Defaults to 50, maximum 200. */
	readonly batchSize?: number;
	/** Maximum projected records per source item and locale. Defaults to 100. */
	readonly maxRecordsPerItem?: number;
	/** Full reconciliation interval, in seconds. Defaults to one hour; minimum one minute. */
	readonly reconcileIntervalSeconds?: number;
};

export type ResolvedOptions = {
	readonly client: Client;
	readonly indexes: readonly IndexOptions[];
	readonly batchSize: number;
	readonly maxRecordsPerItem: number;
	readonly reconcileIntervalSeconds: number;
};
