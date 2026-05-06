import type { infer } from "zod";
import type { DocumentBuilderHooks } from "../../../../types/hooks.js";
import type { LocaleValue } from "../../../../types/shared.js";
import type {
	LucidBrickTableName,
	LucidDocumentTableName,
	LucidVersionTableName,
} from "../../../../types.js";
import type { CFConfig, FieldTypes } from "../../custom-fields/types.js";
import type BrickBuilder from "../brick-builder/index.js";
import type CollectionConfigSchema from "./schema.js";

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
	name: LocaleValue;
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

export interface CollectionConfigSchemaType
	extends infer<typeof CollectionConfigSchema> {
	hooks?: DocumentBuilderHooks[];
	bricks?: {
		fixed?: Array<BrickBuilder>;
		builder?: Array<BrickBuilder>;
	};
}

export type CollectionData = {
	key: string;
	mode: CollectionConfigSchemaType["mode"];
	details: {
		name: LocaleValue;
		singularName: LocaleValue;
		summary: LocaleValue | null;
	};
	config: {
		locked: boolean;
		revisions: boolean;
		translations: boolean;
		autoSave: boolean;
		review?: PublishingReviewConfig;
		workflow?: PublishingWorkflowConfig;
		displayInListing: string[];
		environments: {
			key: string;
			name: LocaleValue;
			permissions: CollectionEnvironmentPermissions;
		}[];
		revisionRetentionDays: number | false;
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
	fields: CFConfig<FieldTypes>[];
}

export type CollectionTableNames = {
	document: LucidDocumentTableName;
	version: LucidVersionTableName;
	documentFields: LucidBrickTableName;
};
