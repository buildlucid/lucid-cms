import type { Collection } from "../../types/response.js";
import { tenantAccessAllowed } from "../../utils/helpers/index.js";
import type BrickBuilder from "../collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type CustomField from "../collection/custom-fields/custom-field.js";
import type {
	CFConfig,
	FieldTypes,
} from "../collection/custom-fields/types.js";
import type { MigrationStatus } from "../collection/get-collection-migration-status.js";
import { hydrateAdminCopyDefaults } from "../i18n/hydrate-admin-copy-defaults.js";
import {
	resolveCollectionPermission,
	resolveCollectionPermissions,
} from "../permission/collection-permissions.js";

const formatMultiple = (props: {
	collections: CollectionBuilder[];
	tenantKey?: string | null;
	queueSupportsScheduling?: boolean;
	adminTranslations?: Record<string, string>;
	include?: {
		bricks?: boolean;
		fields?: boolean;
		documentId?: boolean;
	};
	documents?: Array<{
		id: number;
		collection_key: string;
	}>;
}) => {
	return props.collections.map((c) =>
		formatSingle({
			collection: c,
			tenantKey: props.tenantKey,
			queueSupportsScheduling: props.queueSupportsScheduling,
			adminTranslations: props.adminTranslations,
			include: props.include,
			documents: props.documents,
		}),
	);
};

const formatSingle = (props: {
	collection: CollectionBuilder;
	tenantKey?: string | null;
	queueSupportsScheduling?: boolean;
	adminTranslations?: Record<string, string>;
	migrationStatus?: MigrationStatus;
	include?: {
		bricks?: boolean;
		fields?: boolean;
		documentId?: boolean;
	};
	documents?: Array<{
		id?: number;
		collection_key: string;
	}>;
}): Collection => {
	const collectionData = props.collection.getData;
	const key = props.collection.key;
	const resolvedPermissions = resolveCollectionPermissions(props.collection);

	const formattedCollection: Collection = {
		key: key,
		mode: collectionData.mode,
		documentId: props.include?.documentId
			? getDocumentId(key, props.documents)
			: undefined,
		details: {
			name: collectionData.details.name,
			singularName: collectionData.details.singularName,
			summary: collectionData.details.summary,
		},
		config: {
			localized: collectionData.config.localized,
			revisions: collectionData.config.revisions,
			locked: collectionData.config.locked,
			displayInListing: props.collection.displayInListing,
			autoSave: collectionData.config.autoSave,
			scheduling: collectionData.config.scheduling,
			revisionRetentionDays: collectionData.config.revisionRetentionDays,
			review: collectionData.config.review,
			workflow: collectionData.config.workflow,
			environments: collectionData.config.environments.map((environment) => ({
				key: environment.key,
				name: environment.name,
				permissions: {
					publish: resolveCollectionPermission({
						collection: props.collection,
						action: "publish",
						target: environment.key,
					}),
					review: resolveCollectionPermission({
						collection: props.collection,
						action: "review",
						target: environment.key,
					}),
				},
			})),
		},
		capabilities: {
			scheduling:
				collectionData.config.scheduling === true &&
				props.queueSupportsScheduling === true,
		},
		permissions: resolvedPermissions,
		migrationStatus: props.migrationStatus ?? null,
		fixedBricks: props.include?.bricks
			? (props.collection.config.bricks?.fixed
					?.filter((brick) =>
						tenantAccessAllowed(brick.config.tenantKeys, props.tenantKey),
					)
					.map(formatBrick) ?? [])
			: [],
		builderBricks: props.include?.bricks
			? (props.collection.config.bricks?.builder
					?.filter((brick) =>
						tenantAccessAllowed(brick.config.tenantKeys, props.tenantKey),
					)
					.map(formatBrick) ?? [])
			: [],
		fields: props.include?.fields
			? formatFields(props.collection.fieldTree, props.collection.fields)
			: [],
	};

	return hydrateAdminCopyDefaults(formattedCollection, props.adminTranslations);
};

const formatBrick = (
	brick: BrickBuilder,
): Collection["fixedBricks"][number] => ({
	key: brick.key,
	details: brick.config.details,
	preview: brick.config.preview,
	fields: formatFields(brick.fieldTree, brick.fields),
});

const formatFields = (
	fields: CFConfig<FieldTypes>[],
	instances: Map<string, CustomField<FieldTypes>>,
): Collection["fields"] => {
	return fields.map((field) => formatField(field, instances));
};

const formatField = (
	field: CFConfig<FieldTypes>,
	instances: Map<string, CustomField<FieldTypes>>,
): Collection["fields"][number] => {
	const nestedFields =
		"fields" in field && Array.isArray(field.fields) ? field.fields : undefined;

	const fieldInstance = instances.get(field.key);
	const aiConfig = fieldInstance
		? getFieldAiConfig(field, fieldInstance)
		: undefined;

	const formattedField = {
		...field,
	} as Collection["fields"][number] & {
		fields?: Collection["fields"];
		ai?: Collection["fields"][number]["ai"];
	};

	if (aiConfig) {
		formattedField.ai = aiConfig;
	} else {
		delete formattedField.ai;
	}

	if (nestedFields) {
		formattedField.fields = formatFields(nestedFields, instances);
	}

	return formattedField;
};

const getFieldAiConfig = (
	field: CFConfig<FieldTypes>,
	fieldInstance: CustomField<FieldTypes>,
): Collection["fields"][number]["ai"] => {
	if (!fieldInstance.supportsAi) return undefined;

	const fieldHasAiConfig = Object.hasOwn(field, "ai");
	const aiConfig = fieldInstance.aiConfig;
	if (
		aiConfig.enabled !== true &&
		aiConfig.guidance.length === 0 &&
		fieldHasAiConfig === false
	) {
		return undefined;
	}

	return {
		enabled: aiConfig.enabled,
		guidance: aiConfig.guidance.map((guidance) => ({
			key: guidance.key,
			label: guidance.label,
		})),
	};
};

const getDocumentId = (
	collectionKey: string,
	documents?: Array<{
		id?: number;
		collection_key: string;
	}>,
) => {
	const document = documents?.find(
		(document) => document.collection_key === collectionKey,
	);

	return document?.id ?? undefined;
};

export default {
	formatMultiple,
	formatSingle,
};
