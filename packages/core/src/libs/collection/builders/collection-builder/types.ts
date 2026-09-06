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
	/** Show this field as a column in the collection listing. */
	showInList?: ShowInList;
};
export type CollectionLabelFieldOptions = CollectionListFieldOptions & {
	/** Use this field when displaying a document label. */
	useAsLabel?: UseAsLabel;
};
/** Maps related collection keys to the version to read when resolving references for a publishing target. */
export type CollectionTargetVersionMap = Record<string, string>;
/** A navigation group key, or a key with display copy and sort order. */
export type CollectionGroupOptions =
	| string
	| {
			/** Stable key used to identify this item. */
			key: string;
			/** Display label for the navigation group. */
			label?: AdminCopyInput;
			/** Navigation order. Lower values appear first. */
			order?: number;
	  };
export type CollectionGroupConfig = {
	key: string;
	label: ResolvedAdminCopy | null;
	order: number | null;
};

/** Use true for project locales, false to disable localization, or select project locale codes and a default. */
export type CollectionLocalizationConfig =
	| boolean
	| {
			/** Content locale codes enabled for this collection. Each must exist in project config. */
			locales: string[];
			/** Default locale for this collection, chosen from its enabled locales. */
			defaultLocale?: string;
	  }
	| {
			locales?: never;
			/** Override the project default content locale. */
			defaultLocale: string;
	  };

export type CollectionPreviewURLResolverProps<
	TCollectionKey extends string = CollectionDocumentKey,
> = {
	/** The document being previewed. */
	document: CollectionDocument<TCollectionKey>;
	/** Environment values, or null when no environment is available. */
	env: EnvironmentVariables | null;
	/** Content locale requested for this preview. */
	locale: string | null;
	/** Document route path resolved for the requested preview locale. */
	path: string | null;
};

/** Build a preview URL from the document and requested locale. Return null when no preview is available. */
export type CollectionPreviewURLResolver<
	TCollectionKey extends string = CollectionDocumentKey,
> = (
	props: CollectionPreviewURLResolverProps<TCollectionKey>,
) => string | URL | null | Promise<string | URL | null>;

export type CollectionPreviewBreakpointConfig = {
	key: string;
	label: AdminCopyInput;
	/** Viewport width in pixels. */
	width: number;
};

export type CollectionPreviewBreakpoint = {
	key: string;
	label: ResolvedAdminCopy;
	/** Viewport width in pixels. */
	width: number;
};

export type CollectionPreviewOptions<
	TCollectionKey extends string = CollectionDocumentKey,
> = {
	/** Whether previews are available for this collection. Defaults to true when preview options are supplied. */
	enabled?: boolean;
	/**
	 * Builds the website URL used to preview a document. When omitted, Lucid uses
	 * the document route on the same host. Return null if the document cannot be
	 * previewed.
	 */
	url?(
		props: CollectionPreviewURLResolverProps<TCollectionKey>,
	): string | URL | null | Promise<string | URL | null>;
	/** How long generated preview links remain valid, in seconds. Defaults to one hour; the maximum is seven days. */
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

/** Revision retention settings. Disabling revisions preserves the configured retention value. */
export type CollectionRevisionOptions = {
	/** Whether to keep previous document versions as revisions. */
	enabled: boolean;
	/** Days to keep revisions. Defaults to 30; false keeps them indefinitely. */
	retentionDays?: number | false;
};

/** Optional publishing targets and editorial review rules. */
export type CollectionPublishingOptions = {
	/** Allow scheduled publishing. Defaults to false. */
	scheduling?: boolean;
	/** Require approval for selected publishing targets. */
	review?: {
		/** Publishing target keys that need review before publishing. */
		requiredFor?: string[];
		/** Allow the requester to approve their own request. Defaults to false. */
		allowSelfApproval?: boolean;
		/** Choose whether reviewers and requesters must leave a comment. */
		comments?: {
			/** Comment requirement when requesting review. Defaults to required. */
			request?: PublishingReviewCommentRequirement;
			/** Comment requirement when approving or rejecting review. Defaults to optional. */
			decision?: PublishingReviewCommentRequirement;
		};
	};
	/** Editorial stages through which documents can move. */
	workflow?: {
		/** Initial stage key. Defaults to the first stage. */
		initial?: string;
		/** Available stages in display order. */
		stages: Array<{
			/** Stable key used to identify this item. */
			key: string;
			label: AdminCopyInput;
			/** Stage badge color. Defaults to grey. */
			color?: PublishingWorkflowStageColor;
			/** Publishing targets available from this stage. */
			publishTargets?: string[];
		}>;
	};
	/** Named versions that editors may publish to. */
	targets?: Array<{
		/** Unique publishing target key. */
		key: string;
		/** Publishing target label shown to editors. */
		label: AdminCopyInput;
		/** Targets that must contain the current content before publishing to this target. */
		requires?: string[];
		/** Versions to use when resolving related documents from this target. */
		collectionVersions?: CollectionTargetVersionMap;
	}>;
};

/** Authoring options for a collection. The key is supplied separately to CollectionBuilder. */
export type CollectionOptions<
	TCollectionKey extends string = CollectionDocumentKey,
> = {
	/** Allow one document or a list of documents. */
	mode: "single" | "multiple";
	/** Group the collection in the admin navigation. */
	group?: CollectionGroupOptions;
	/** Labels and help text shown to editors. */
	details: {
		/** Singular and plural names used throughout the admin. */
		labels: { singular: AdminCopyInput; plural: AdminCopyInput };
		/** Explain what content belongs in this collection. */
		description?: AdminCopyInput;
	};
	/** Prevent document changes, including saves and deletions. Defaults to false. */
	locked?: boolean;
	/** Enable content localization or choose a subset of configured locales. Defaults to false. */
	localized?: CollectionLocalizationConfig;
	/** Keep previous versions. Omission disables revisions; true keeps them for 30 days. Use retentionDays: false to keep them indefinitely. */
	revisions?: true | CollectionRevisionOptions;
	/** Save editor changes automatically. Defaults to false. */
	autoSave?: boolean;
	/** Allow editors to reorder documents. Defaults to false. */
	orderable?: boolean;
	/** Publishing targets, scheduling, review and workflow settings. */
	publishing?: CollectionPublishingOptions;
	/** Top-level field containing each document's complete public path. */
	routing?: { field: string };
	/** Enable website previews. Omitted or false disables previews; true uses the document route. */
	preview?: CollectionPreviewConfig<TCollectionKey>;
	/** Document lifecycle hooks scoped to this collection. */
	hooks?: CollectionBuilderHooks[];
	/** Bricks available in each editing context. */
	bricks?: {
		/** Bricks included in every document in this order. */
		fixed?: Array<BrickBuilder>;
		/** Bricks editors may add and reorder in the document builder. */
		builder?: Array<BrickBuilder>;
		/** Bricks available inside rich-text content. */
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
