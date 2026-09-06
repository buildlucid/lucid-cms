import type {
	CollectionDocument,
	CollectionDocumentKey,
	EnvironmentVariables,
} from "../../../../exports/types.js";
import type {
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTableName,
} from "../../../db/tables/index.js";
import type { CollectionBuilderHooks } from "../../../hooks/types.js";
import type { AdminCopyInput, ResolvedAdminCopy } from "../../../i18n/types.js";
import type { FieldConfig, FieldTypes } from "../../custom-fields/types.js";
import type BrickBuilder from "../brick-builder/index.js";

export type ShowInList = boolean;
export type UseAsLabel = boolean;
export type CollectionListFieldOptions = {
	showInList?: ShowInList;
};
export type CollectionLabelFieldOptions = CollectionListFieldOptions & {
	useAsLabel?: UseAsLabel;
};
export type CollectionTargetVersionMap = Record<string, string>;
export type CollectionGroupOptions =
	| string
	| {
			key: string;
			label?: AdminCopyInput;
			order?: number;
	  };
export type CollectionGroupConfig = {
	key: string;
	label: ResolvedAdminCopy | null;
	order: number | null;
};

export type CollectionLocalizationConfig =
	| boolean
	| {
			locales: string[];
			defaultLocale?: string;
	  }
	| {
			locales?: never;
			defaultLocale: string;
	  };

export type CollectionPreviewURLResolverProps<
	TCollectionKey extends string = CollectionDocumentKey,
> = {
	document: CollectionDocument<TCollectionKey>;
	env: EnvironmentVariables | null;
	locale: string;
	/** Document route path resolved for the requested preview locale. */
	path: string | null;
};

export type CollectionPreviewURLResolver<
	TCollectionKey extends string = CollectionDocumentKey,
> = (
	props: CollectionPreviewURLResolverProps<TCollectionKey>,
) => string | URL | null | Promise<string | URL | null>;

export type CollectionPreviewBreakpointConfig = {
	key: string;
	label: AdminCopyInput;
	width: number;
};

export type CollectionPreviewBreakpoint = {
	key: string;
	label: ResolvedAdminCopy;
	width: number;
};

export type CollectionPreviewOptions<
	TCollectionKey extends string = CollectionDocumentKey,
> = {
	/** Whether previews are available for this collection. */
	enabled?: boolean;
	/**
	 * Builds the website URL used to preview a document. When omitted, Lucid uses
	 * the document route on the same host. Return null if the document cannot be
	 * previewed.
	 */
	url?(
		props: CollectionPreviewURLResolverProps<TCollectionKey>,
	): string | URL | null | Promise<string | URL | null>;
	/** How long generated preview links remain valid, in seconds. Defaults to one hour. */
	expiresInSeconds?: number;
	/** Named viewport widths shown in the builder preview. */
	breakpoints?: CollectionPreviewBreakpointConfig[];
};

export type CollectionPreviewConfig<
	TCollectionKey extends string = CollectionDocumentKey,
> = boolean | CollectionPreviewOptions<TCollectionKey>;

export type PublishingReviewCommentRequirement = "required" | "optional";
export type PublishingReviewConfig = {
	requiredFor: string[];
	allowSelfApproval: boolean;
	comments: {
		request: PublishingReviewCommentRequirement;
		decision: PublishingReviewCommentRequirement;
	};
};
export type PublishingWorkflowStageColor =
	| "grey"
	| "red"
	| "yellow"
	| "green"
	| "blue"
	| "purple";

export type PublishingWorkflowStageConfig = {
	key: string;
	label: ResolvedAdminCopy;
	color: PublishingWorkflowStageColor;
	publishTargets: string[];
};

export type PublishingWorkflowConfig = {
	initial: string;
	stages: PublishingWorkflowStageConfig[];
};

export type CollectionRevisionOptions = {
	/** Whether to keep previous document versions as revisions. */
	enabled: boolean;
	/** Days to keep revisions. False keeps them indefinitely. */
	retentionDays?: number | false;
};

export type CollectionPublishingOptions = {
	scheduling?: boolean;
	review?: {
		requiredFor?: string[];
		allowSelfApproval?: boolean;
		comments?: {
			request?: PublishingReviewCommentRequirement;
			decision?: PublishingReviewCommentRequirement;
		};
	};
	workflow?: {
		initial?: string;
		stages: Array<{
			key: string;
			label: AdminCopyInput;
			color?: PublishingWorkflowStageColor;
			publishTargets?: string[];
		}>;
	};
	targets?: Array<{
		key: string;
		label: AdminCopyInput;
		requires?: string[];
		collectionVersions?: CollectionTargetVersionMap;
	}>;
};

export type CollectionOptions<
	TCollectionKey extends string = CollectionDocumentKey,
> = {
	mode: "single" | "multiple";
	group?: CollectionGroupOptions;
	details: {
		labels: { singular: AdminCopyInput; plural: AdminCopyInput };
		description?: AdminCopyInput;
	};
	locked?: boolean;
	localized?: CollectionLocalizationConfig;
	revisions?: true | CollectionRevisionOptions;
	autoSave?: boolean;
	orderable?: boolean;
	publishing?: CollectionPublishingOptions;
	/** Top-level field containing each document's complete public path. */
	routing?: { field: string };
	preview?: CollectionPreviewConfig<TCollectionKey>;
	hooks?: CollectionBuilderHooks[];
	bricks?: {
		fixed?: Array<BrickBuilder>;
		builder?: Array<BrickBuilder>;
		embedded?: Array<BrickBuilder>;
	};
};

export type CollectionData = {
	key: string;
	mode: CollectionOptions["mode"];
	group: CollectionGroupConfig | null;
	details: {
		labels: { singular: ResolvedAdminCopy; plural: ResolvedAdminCopy };
		description: ResolvedAdminCopy | null;
	};
	locked: boolean;
	revisions: Required<CollectionRevisionOptions>;
	localized: boolean;
	autoSave: boolean;
	orderable: boolean;
	listing: string[];
	labelFields: string[];
	publishing: {
		scheduling: boolean;
		review?: PublishingReviewConfig;
		workflow?: PublishingWorkflowConfig;
		targets: {
			key: string;
			label: ResolvedAdminCopy;
			requires: string[];
			collectionVersions: CollectionTargetVersionMap;
		}[];
	};
	routing: {
		field: string;
	} | null;
	preview: {
		breakpoints: CollectionPreviewBreakpoint[];
	} | null;
};

export type FieldFilters = Array<{
	key: string;
	type: FieldTypes;
}>;

export interface CollectionBrickConfig {
	key: BrickBuilder["key"];
	details: BrickBuilder["config"]["details"];
	thumbnail: BrickBuilder["config"]["thumbnail"];
	fields: FieldConfig<FieldTypes>[];
}

export type CollectionTableNames = {
	document: LucidDocumentTableName;
	version: LucidVersionTableName;
	documentFields: LucidBrickTableName;
};
