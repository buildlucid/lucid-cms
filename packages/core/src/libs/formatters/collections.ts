import type { LocalizationConfig } from "../../types/config.js";
import type { Collection } from "../../types/response.js";
import type BrickBuilder from "../collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../collection/builders/collection-builder/index.js";
import type {
	FieldConfig,
	FieldTypes,
	SharedFieldConfig,
} from "../collection/custom-fields/types.js";
import getContentAccess from "../collection/field-access/get-content-access.js";
import type {
	BrickAccess,
	FieldAccess,
	FieldAccessActor,
} from "../collection/field-access/types.js";
import type { MigrationStatus } from "../collection/get-collection-migration-status.js";
import resolveCollectionLocalization from "../collection/helpers/resolve-collection-localization.js";
import { hydrateAdminCopyDefaults } from "../i18n/hydrate-admin-copy-defaults.js";
import {
	resolveCollectionPermission,
	resolveCollectionPermissions,
} from "../permission/collection-permissions.js";
import { resolveFieldPermissions } from "../permission/field-permissions.js";

/** The collection, and brick when there is one, that generated field permissions belong to. */
type PermissionOwner = { collection: string; brick?: string };

type ConditionExpression =
	| { field: string }
	| { all?: ConditionExpression[]; any?: ConditionExpression[] };

const conditionFields = (expression: ConditionExpression): string[] =>
	"field" in expression
		? [expression.field]
		: [...(expression.all ?? []), ...(expression.any ?? [])].flatMap(
				conditionFields,
			);

const formatMultiple = (props: {
	collections: CollectionBuilder[];
	allCollections: CollectionBuilder[];
	queueSupportsDelayedDelivery?: boolean;
	adminTranslations?: Record<string, string>;
	localization: LocalizationConfig;
	include?: {
		bricks?: boolean;
		fields?: boolean;
		documentId?: boolean;
	};
	documents?: Array<{
		id: number;
		collection_key: string;
	}>;
	/** Leaves out the fields and bricks this reader can't see. */
	reader?: FieldAccessActor;
}) => {
	const documentTargetCollectionKeys = getDocumentTargetCollectionKeys({
		collections: props.allCollections,
	});

	return props.collections.map((c) =>
		formatSingle({
			collection: c,
			documentTargetCollectionKeys,
			queueSupportsDelayedDelivery: props.queueSupportsDelayedDelivery,
			adminTranslations: props.adminTranslations,
			localization: props.localization,
			include: props.include,
			documents: props.documents,
			reader: props.reader,
		}),
	);
};

const formatSingle = (props: {
	collection: CollectionBuilder;
	allCollections?: CollectionBuilder[];
	documentTargetCollectionKeys?: Set<string>;
	queueSupportsDelayedDelivery?: boolean;
	adminTranslations?: Record<string, string>;
	localization: LocalizationConfig;
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
	/** Leaves out the fields and bricks this reader can't see, and conditions that depend on them. */
	reader?: FieldAccessActor;
}): Collection => {
	const collectionData = props.collection.getData;
	const key = props.collection.key;
	const resolvedPermissions = resolveCollectionPermissions(props.collection);
	const access = props.reader
		? getContentAccess(props.collection, props.reader)
		: undefined;

	const formatBricks = (bricks: BrickBuilder[] | undefined) =>
		(bricks ?? []).flatMap((brick) => {
			const brickAccess = access?.bricks.get(brick.key);
			if (brickAccess?.access === "hidden") return [];

			return [
				formatBrick({
					brick,
					collectionKey: props.collection.key,
					documentTargetCollectionKeys,
					access: brickAccess,
				}),
			];
		});

	const localization = resolveCollectionLocalization({
		localization: props.localization,
		collection: props.collection,
	});

	const documentTargetCollectionKeys =
		props.documentTargetCollectionKeys ??
		getDocumentTargetCollectionKeys({
			collections: props.allCollections ?? [props.collection],
		});

	const formattedCollection: Collection = {
		key: key,
		mode: collectionData.mode,
		routing: collectionData.routing,
		group: collectionData.group,
		documentId: props.include?.documentId
			? getDocumentId(key, props.documents)
			: undefined,
		details: {
			labels: {
				singular: collectionData.details.labels.singular,
				plural: collectionData.details.labels.plural,
			},
			description: collectionData.details.description,
		},
		localized: localization.enabled
			? {
					locales: localization.locales,
					defaultLocale: localization.defaultLocale,
				}
			: false,
		revisions: collectionData.revisions,
		locked: collectionData.locked,
		listing: props.collection.listing.filter(
			(fieldKey) => access?.fields.get(fieldKey) !== "hidden",
		),
		labelFields: collectionData.labelFields,
		autoSave: collectionData.autoSave,
		orderable: collectionData.orderable,
		preview: collectionData.preview,
		capabilities: {
			scheduling:
				collectionData.publishing.scheduling === true &&
				props.queueSupportsDelayedDelivery === true,
			preview: collectionData.preview !== null,
		},
		permissions: resolvedPermissions,
		migrationStatus: props.migrationStatus ?? null,
		fixedBricks: props.include?.bricks
			? formatBricks(props.collection.config.bricks?.fixed)
			: [],
		builderBricks: props.include?.bricks
			? formatBricks(props.collection.config.bricks?.builder)
			: [],
		embeddedBricks: props.include?.bricks
			? formatBricks(props.collection.config.bricks?.embedded)
			: [],
		fields: props.include?.fields
			? formatFields(
					props.collection.fieldTree,
					documentTargetCollectionKeys,
					{ collection: props.collection.key },
					access?.fields,
				)
			: [],
		publishing: {
			environments: collectionData.publishing.environments.map(
				(environment) => ({
					key: environment.key,
					label: environment.label,
					requires: environment.requires,
					permissions: {
						publish: resolveCollectionPermission({
							collection: props.collection,
							action: "publish",
						}),
						review: resolveCollectionPermission({
							collection: props.collection,
							action: "review",
						}),
					},
				}),
			),
			review: collectionData.publishing.review,
			workflow: collectionData.publishing.workflow,
			scheduling: collectionData.publishing.scheduling,
		},
	};

	return hydrateAdminCopyDefaults(formattedCollection, props.adminTranslations);
};

const formatBrick = (props: {
	brick: BrickBuilder;
	collectionKey: string;
	documentTargetCollectionKeys: Set<string>;
	access?: BrickAccess;
}): Collection["fixedBricks"][number] => {
	const owner = { collection: props.collectionKey, brick: props.brick.key };
	const permissions = resolveFieldPermissions(
		owner,
		props.brick.config.permissions,
	);

	return {
		key: props.brick.key,
		details: props.brick.config.details,
		thumbnail: props.brick.config.thumbnail,
		...(permissions && { permissions }),
		fields: formatFields(
			props.brick.fieldTree,
			props.documentTargetCollectionKeys,
			owner,
			props.access?.fields,
		),
	};
};

/** Formats a field list, leaving out fields the reader can't see. */
const formatFields = (
	fields: FieldConfig<FieldTypes>[],
	documentTargetCollectionKeys: Set<string>,
	owner: PermissionOwner,
	access: ReadonlyMap<string, FieldAccess> | undefined,
): Collection["fields"] => {
	return fields.flatMap((field) =>
		access?.get(field.key) === "hidden"
			? []
			: [formatField(field, documentTargetCollectionKeys, owner, access)],
	);
};

const formatField = (
	field: FieldConfig<FieldTypes>,
	documentTargetCollectionKeys: Set<string>,
	owner: PermissionOwner,
	access: ReadonlyMap<string, FieldAccess> | undefined,
): Collection["fields"][number] => {
	const nestedFields =
		"fields" in field && Array.isArray(field.fields) ? field.fields : undefined;

	//* agent guidance stays out of the admin; collections_describe reads it from the builders
	const {
		ai: _ai,
		permissions: _permissions,
		...config
	}: Pick<SharedFieldConfig, "ai" | "permissions"> &
		FieldConfig<FieldTypes> = field;
	const permissions = resolveFieldPermissions(
		{ ...owner, field: field.key },
		field.permissions,
	);
	const formattedField = {
		...config,
		...(permissions && { permissions }),
	} as Collection["fields"][number] & {
		fields?: Collection["fields"];
	};
	if (
		"validation" in field &&
		field.validation &&
		"zod" in field.validation &&
		"validation" in formattedField
	) {
		const { zod: _schema, ...validation } = field.validation;
		formattedField.validation = validation;
	}

	if (formattedField.type === "relation") {
		const filteredCollection = (
			Array.isArray(formattedField.collection)
				? formattedField.collection
				: [formattedField.collection]
		).filter((collectionKey) =>
			documentTargetCollectionKeys.has(collectionKey),
		);

		formattedField.collection = filteredCollection;
		formattedField.default = formattedField.default?.filter((defaultValue) =>
			documentTargetCollectionKeys.has(defaultValue.collectionKey),
		);
	}

	if (nestedFields) {
		formattedField.fields = formatFields(
			nestedFields,
			documentTargetCollectionKeys,
			owner,
			access,
		);
	}

	//* a hidden field mustn't control what shows; server validation keeps the condition
	const condition = formattedField.ui?.condition;
	if (
		formattedField.ui &&
		condition &&
		conditionFields(condition).some((key) => access?.get(key) === "hidden")
	) {
		const { condition: _condition, ...ui } = formattedField.ui;
		formattedField.ui = ui;
	}

	return formattedField;
};

const getDocumentTargetCollectionKeys = (props: {
	collections: CollectionBuilder[];
}) => new Set(props.collections.map((collection) => collection.key));

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
