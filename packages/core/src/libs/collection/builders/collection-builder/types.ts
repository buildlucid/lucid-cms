import type {
	CollectionDocument,
	EnvironmentVariables,
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTableName,
} from "../../../../types.js";
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

export type CollectionPreviewURLResolver = (props: {
	document: CollectionDocument;
	env: EnvironmentVariables | null;
	locale: string;
	tenantKey: string | null;
}) => string | URL | null | Promise<string | URL | null>;

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

export type CollectionPreviewConfig = {
	url: CollectionPreviewURLResolver;
	/** How long generated preview links remain valid, in seconds. Defaults to one hour. */
	expiresIn?: number;
	/** Named viewport widths shown in the builder preview. */
	breakpoints?: CollectionPreviewBreakpointConfig[];
};

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

export type CollectionConfigSchemaType = {
	key: string;
	mode: "single" | "multiple";
	group?: CollectionGroupConfigInput;
	tenants?: string[];
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
	preview?: CollectionPreviewConfig;
	hooks?: CollectionBuilderHooks[];
	bricks?: {
		fixed?: Array<BrickBuilder>;
		builder?: Array<BrickBuilder>;
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
	preview: {
		breakpoints: CollectionPreviewBreakpoint[];
	} | null;
	tenants: string[];
};

export type FieldFilters = Array<{
	key: string;
	type: FieldTypes;
}>;

export interface CollectionBrickConfig {
	key: BrickBuilder["key"];
	details: BrickBuilder["config"]["details"];
	preview: BrickBuilder["config"]["preview"];
	tenants: BrickBuilder["config"]["tenants"];
	fields: CFConfig<FieldTypes>[];
}

export type CollectionTableNames = {
	document: LucidDocumentTableName;
	version: LucidVersionTableName;
	documentFields: LucidBrickTableName;
};
