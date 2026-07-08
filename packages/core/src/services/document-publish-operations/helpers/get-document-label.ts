import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type {
	CFConfig,
	FieldTypes,
} from "../../../libs/collection/custom-fields/types.js";
import prefixGeneratedColName from "../../../libs/collection/helpers/prefix-generated-column-name.js";
import { getDocumentFieldsTableSchema } from "../../../libs/collection/schema/runtime/runtime-schema-selectors.js";
import type {
	AdminCopyInput,
	ResolvedAdminCopy,
} from "../../../libs/i18n/types.js";
import type { DocumentBricksRepository } from "../../../libs/repositories/index.js";
import type { CollectionTableNames } from "../../../types.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";

const supportedLabelFieldTypes = [
	"text",
	"textarea",
	"select",
	"number",
	"datetime",
	"color",
] as const;

type SupportedLabelFieldType = Extract<
	(typeof supportedLabelFieldTypes)[number],
	FieldTypes
>;
type LabelFieldConfig = CFConfig<SupportedLabelFieldType>;

/** Reads copy defaults so fallback labels stay useful outside the admin app. */
const copyFallback = (
	copy: AdminCopyInput | ResolvedAdminCopy | null | undefined,
) => {
	if (!copy) return null;
	if (typeof copy === "string") return copy;
	if (copy.type === "lucid.literal") return copy.value;
	return copy.defaultMessage ?? null;
};

/** Builds a stable label when no configured label value is available. */
const getFallbackLabel = (
	collection: CollectionBuilder,
	documentId: number,
) => {
	const collectionData = collection.getData;
	const collectionName =
		copyFallback(collectionData.details.singularName) ??
		copyFallback(collectionData.details.name) ??
		collection.key;

	return `${collectionName} #${documentId}`;
};

/** Keeps publish event labels to direct scalar fields we can read cheaply. */
const isSupportedLabelField = (
	collection: CollectionBuilder,
	fieldKey: string | null | undefined,
) => {
	if (!fieldKey) return false;

	const field = collection.fields.get(fieldKey);
	if (!field) return false;
	if (field.treeParent !== null || field.structuralParent !== null)
		return false;

	return supportedLabelFieldTypes.some((type) => type === field.type);
};

/** Mirrors admin label precedence using only directly stored document fields. */
const getLabelField = (collection: CollectionBuilder) => {
	for (const fieldKey of collection.labelFields) {
		if (isSupportedLabelField(collection, fieldKey)) {
			return collection.fields.get(fieldKey)?.config as
				| LabelFieldConfig
				| undefined;
		}
	}

	for (const fieldKey of collection.listing) {
		if (isSupportedLabelField(collection, fieldKey)) {
			return collection.fields.get(fieldKey)?.config as
				| LabelFieldConfig
				| undefined;
		}
	}

	for (const field of collection.fields.values()) {
		if (isSupportedLabelField(collection, field.key)) {
			return field.config as LabelFieldConfig;
		}
	}
};

/** Converts stored scalar values into compact display labels. */
const normalizeScalarLabelValue = (value: unknown) => {
	if (typeof value === "string") {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}

	if (typeof value === "number" && Number.isFinite(value)) {
		return String(value);
	}

	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value.toISOString();
	}

	return null;
};

/** Uses select option copy so stored values render as editor-facing labels. */
const formatSelectLabelValue = (
	field: Extract<LabelFieldConfig, { type: "select" }>,
	value: unknown,
) => {
	const values = Array.isArray(value) ? value : [value];
	const labels = values
		.map((item) => {
			const option = field.options.find(
				(option) => String(option.value) === String(item),
			);

			if (!option) return normalizeScalarLabelValue(item);

			return (
				copyFallback(option.label) ?? normalizeScalarLabelValue(option.value)
			);
		})
		.filter((label): label is string => label !== null);

	return labels.length > 0 ? labels.join(", ") : null;
};

/** Applies field-specific label formatting before falling back. */
const normalizeLabelValue = (field: LabelFieldConfig, value: unknown) => {
	if (field.type === "select") return formatSelectLabelValue(field, value);
	return normalizeScalarLabelValue(value);
};

/** Resolves the document label snapshot stored on publish operation events. */
const getDocumentLabel = async (params: {
	context: ServiceContext;
	bricks: DocumentBricksRepository;
	collection: CollectionBuilder;
	tables: CollectionTableNames;
	operation: {
		document_id: number;
		source_version_id: number;
	};
}): ServiceResponse<string | null> => {
	const labelField = getLabelField(params.collection);
	if (!labelField) {
		return {
			error: undefined,
			data: getFallbackLabel(params.collection, params.operation.document_id),
		};
	}

	const documentFieldsTableSchemaRes = await getDocumentFieldsTableSchema(
		params.context,
		params.collection.key,
	);
	if (documentFieldsTableSchemaRes.error) return documentFieldsTableSchemaRes;
	if (!documentFieldsTableSchemaRes.data) {
		return {
			error: undefined,
			data: getFallbackLabel(params.collection, params.operation.document_id),
		};
	}

	const fieldsRes = await params.bricks.selectMultipleByVersionId(
		{
			versionId: params.operation.source_version_id,
			documentId: params.operation.document_id,
			bricksSchema: [
				{
					name: params.tables.documentFields,
					columns: documentFieldsTableSchemaRes.data.columns,
				},
			],
		},
		{
			tableName: params.tables.version,
		},
	);
	if (fieldsRes.error) return fieldsRes;

	const columnName = prefixGeneratedColName(labelField.key);
	const documentFields = (fieldsRes.data?.[params.tables.documentFields] ??
		[]) as Array<Record<string, unknown>>;
	const value = documentFields
		.map((field) => field[columnName])
		.map((value) => normalizeLabelValue(labelField, value))
		.find((value) => value !== null);

	return {
		error: undefined,
		data:
			value ??
			getFallbackLabel(params.collection, params.operation.document_id),
	};
};

export default getDocumentLabel;
