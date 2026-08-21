import type {
	CollectionDocument,
	CollectionDocumentKey,
	EnvironmentVariables,
} from "../../../../types.js";
import type {
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTableName,
} from "../../../db/tables/index.js";
import type { CollectionBuilderHooks } from "../../../hooks/types.js";
import type { AdminCopyInput, ResolvedAdminCopy } from "../../../i18n/types.js";
import type { CFConfig, FieldTypes } from "../../custom-fields/types.js";
import type BrickBuilder from "../brick-builder/index.js";

export type ShowInList = boolean;
export type UseAsLabel = boolean;
export type CollectionListFieldOptions = {
	showInList?: ShowInList;
};
export type CollectionLabelFieldOptions = CollectionListFieldOptions & {
	useAsLabel?: UseAsLabel;
};
export type CollectionEnvironmentVersionMap = Record<string, string>;
export type CollectionGroupConfigInput =
	| string
	| {
			key: string;
			name?: AdminCopyInput;
			order?: number;
	  };
export type CollectionGroupConfig = {
	key: string;
	name: ResolvedAdminCopy | null;
	order: number | null;
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
	enabled: boolean;
	/**
	 * Builds the website URL used to preview a document. When omitted, Lucid uses
	 * the document route on the same host. Return null if the document cannot be
	 * previewed.
	 */
	url?(
		props: CollectionPreviewURLResolverProps<TCollectionKey>,
	): string | URL | null | Promise<string | URL | null>;
	/** How long generated preview links remain valid, in seconds. Defaults to one hour. */
	expiresIn?: number;
	/** Named viewport widths shown in the builder preview. */
	breakpoints?: CollectionPreviewBreakpointConfig[];
};

export type CollectionPreviewConfig<
	TCollectionKey extends string = CollectionDocumentKey,
> = true | CollectionPreviewOptions<TCollectionKey>;

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
	name: ResolvedAdminCopy;
	color: PublishingWorkflowStageColor;
	publishTargets: string[];
};

export type PublishingWorkflowConfig = {
	initial: string;
	stages: PublishingWorkflowStageConfig[];
};

export type CollectionConfigSchemaType<
	TCollectionKey extends string = CollectionDocumentKey,
> = {
	key: TCollectionKey;
	mode: "single" | "multiple";
	group?: CollectionGroupConfigInput;
	details: {
		name: AdminCopyInput;
		singularName: AdminCopyInput;
		summary?: AdminCopyInput;
	};
	locked?: boolean;
	localized?: boolean;
	revisions?: boolean;
	autoSave?: boolean;
	scheduling?: boolean;
	orderable?: boolean;
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
			name: AdminCopyInput;
			color?: PublishingWorkflowStageColor;
			publishTargets?: string[];
		}>;
	};
	environments?: Array<{
		key: string;
		name: AdminCopyInput;
		requires?: string[];
		collectionVersions?: CollectionEnvironmentVersionMap;
	}>;
	revisionRetentionDays?: number | false;
	/** Top-level field containing each document's complete public path. */
	routing?: string;
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
	mode: CollectionConfigSchemaType["mode"];
	group: CollectionGroupConfig | null;
	details: {
		name: ResolvedAdminCopy;
		singularName: ResolvedAdminCopy;
		summary: ResolvedAdminCopy | null;
	};
	locked: boolean;
	revisions: boolean;
	localized: boolean;
	autoSave: boolean;
	scheduling: boolean;
	orderable: boolean;
	review?: PublishingReviewConfig;
	workflow?: PublishingWorkflowConfig;
	listing: string[];
	labelFields: string[];
	environments: {
		key: string;
		name: ResolvedAdminCopy;
		requires: string[];
		collectionVersions: CollectionEnvironmentVersionMap;
	}[];
	revisionRetentionDays: number | false;
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
	preview: BrickBuilder["config"]["preview"];
	fields: CFConfig<FieldTypes>[];
}

export type CollectionTableNames = {
	document: LucidDocumentTableName;
	version: LucidVersionTableName;
	documentFields: LucidBrickTableName;
};
