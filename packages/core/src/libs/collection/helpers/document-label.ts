import type { AdminCopyInput, ResolvedAdminCopy } from "../../i18n/types.js";
import type CollectionBuilder from "../builders/collection-builder/index.js";
import fieldConfigs from "../custom-fields/field-configs.js";
import type { CFConfig, FieldTypes } from "../custom-fields/types.js";

type SupportedLabelFieldType = {
	[T in FieldTypes]: (typeof fieldConfigs)[T]["capabilities"]["canBeLabel"] extends true
		? T
		: never;
}[FieldTypes];
export type DocumentLabelFieldConfig = CFConfig<SupportedLabelFieldType>;

const getCopyFallback = (
	copy: AdminCopyInput | ResolvedAdminCopy | null | undefined,
) => {
	if (!copy) return null;
	if (typeof copy === "string") return copy;
	if (copy.type === "lucid.literal") return copy.value;
	return copy.defaultMessage ?? null;
};

const isSupportedLabelField = (
	collection: CollectionBuilder,
	fieldKey: string | null | undefined,
) => {
	if (!fieldKey) return false;

	const field = collection.fields.get(fieldKey);
	if (!field) return false;
	if (field.treeParent !== null || field.structuralParent !== null)
		return false;

	return fieldConfigs[field.type].capabilities.canBeLabel;
};

/** Returns the first supported field using standard document-label precedence. */
export const getDocumentLabelField = (
	collection: CollectionBuilder,
): DocumentLabelFieldConfig | null => {
	const candidates = [
		...collection.labelFields,
		...collection.listing,
		...collection.fields.keys(),
	];

	for (const fieldKey of candidates) {
		if (!isSupportedLabelField(collection, fieldKey)) continue;
		return collection.fields.get(fieldKey)?.config as DocumentLabelFieldConfig;
	}

	return null;
};

/** Builds a stable label when a document has no usable label value. */
export const getDocumentFallbackLabel = (
	collection: CollectionBuilder,
	documentId: number,
) => {
	const details = collection.getData.details;
	const collectionName =
		getCopyFallback(details.singularName) ??
		getCopyFallback(details.name) ??
		collection.key;

	return `${collectionName} #${documentId}`;
};

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

/** Formats a stored scalar value using the field's document-label rules. */
export const formatDocumentLabelValue = (
	field: DocumentLabelFieldConfig,
	value: unknown,
) => {
	if (field.type !== "select") return normalizeScalarLabelValue(value);

	const labels = (Array.isArray(value) ? value : [value])
		.map((item) => {
			const option = field.options.find(
				(option) => String(option.value) === String(item),
			);
			if (!option) return normalizeScalarLabelValue(item);
			return (
				getCopyFallback(option.label) ?? normalizeScalarLabelValue(option.value)
			);
		})
		.filter((label): label is string => label !== null);

	return labels.length > 0 ? labels.join(", ") : null;
};
