import type {
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTableName,
} from "../../../../types.js";
import type { CollectionBuilderHooks } from "../../../hooks/types.js";
import type { AdminCopyInput, ResolvedAdminCopy } from "../../../i18n/types.js";
import type { CFConfig, FieldTypes } from "../../custom-fields/types.js";
import type BrickBuilder from "../brick-builder/index.js";

export type DisplayInListing = boolean;
export type CollectionPermissionAction =
	| "read"
	| "create"
	| "update"
	| "delete"
	| "restore"
	| "publish"
	| "review";
export type CollectionPermissions = Partial<
	Record<CollectionPermissionAction, string>
>;
export type CollectionEnvironmentPermissions = Partial<
	Pick<Record<CollectionPermissionAction, string>, "publish" | "review">
>;
export type CollectionEnvironmentRelations = Record<string, string>;
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
	permissions: {
		moveTo?: string;
		moveFrom?: string;
	};
};

export type PublishingWorkflowConfig = {
	initial: string;
	stages: PublishingWorkflowStageConfig[];
};

export type CollectionConfigSchemaType = {
	key: string;
	mode: "single" | "multiple";
	group?: CollectionGroupConfigInput;
	details: {
		name: AdminCopyInput;
		singularName: AdminCopyInput;
		summary?: AdminCopyInput;
	};
	permissions?: CollectionPermissions;
	config?: {
		locked?: boolean;
		localized?: boolean;
		revisions?: boolean;
		autoSave?: boolean;
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
				name: AdminCopyInput;
				color?: PublishingWorkflowStageColor;
				publishTargets?: string[];
				permissions?: {
					moveTo?: string;
					moveFrom?: string;
				};
			}>;
		};
		environments?: Array<{
			key: string;
			name: AdminCopyInput;
			requires?: string[];
			permissions?: CollectionEnvironmentPermissions;
			relations?: CollectionEnvironmentRelations;
		}>;
		revisionRetentionDays?: number | false;
		tenantKeys?: string[];
	};
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
	config: {
		locked: boolean;
		revisions: boolean;
		localized: boolean;
		autoSave: boolean;
		scheduling: boolean;
		review?: PublishingReviewConfig;
		workflow?: PublishingWorkflowConfig;
		displayInListing: string[];
		environments: {
			key: string;
			name: ResolvedAdminCopy;
			requires: string[];
			permissions: CollectionEnvironmentPermissions;
			relations: CollectionEnvironmentRelations;
		}[];
		revisionRetentionDays: number | false;
		tenantKeys: string[];
	};
	permissions: CollectionPermissions;
};

export type FieldFilters = Array<{
	key: string;
	type: FieldTypes;
}>;

export interface CollectionBrickConfig {
	key: BrickBuilder["key"];
	details: BrickBuilder["config"]["details"];
	preview: BrickBuilder["config"]["preview"];
	tenantKeys: BrickBuilder["config"]["tenantKeys"];
	fields: CFConfig<FieldTypes>[];
}

export type CollectionTableNames = {
	document: LucidDocumentTableName;
	version: LucidVersionTableName;
	documentFields: LucidBrickTableName;
};
