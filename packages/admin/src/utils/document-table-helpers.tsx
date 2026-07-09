import {
	isFieldTypeFilterable,
	isFieldTypeSortable,
} from "@field-capabilities";
import type {
	Collection,
	DocumentField,
	DocumentRef,
	InternalCollectionDocument,
	InternalDocumentField,
} from "@types";
import { FaSolidT, FaSolidUser } from "solid-icons/fa";
import T from "@/translations";
import type {
	CollectionFieldConfig,
	CollectionLeafFieldConfig,
} from "@/types/collection-config";
import dateHelpers from "@/utils/date-helpers";
import helpers from "@/utils/helpers";
import { isObjectRecord } from "@/utils/type-guards";

export const tableHeadColumns = (fields: CollectionFieldConfig[]) => {
	return fields.map((field) => {
		switch (field.type) {
			case "user":
				return {
					label: helpers.getLocaleValue({
						value: field.details.label,
						fallback: field.key,
					}),
					key: field.key,
					icon: <FaSolidUser />,
				};
			default: {
				return {
					label: helpers.getLocaleValue({
						value: field.details.label,
						fallback: field.key,
					}),
					key: field.key,
					icon: <FaSolidT />,
				};
			}
		}
	});
};

const isStructuralField = (field: CollectionFieldConfig) => {
	return (
		field.type === "tab" ||
		field.type === "section" ||
		field.type === "collapsible"
	);
};

/** Returns filterable top-level fields; structural containers inline children. */
export const collectionFieldFilters = (collection?: Collection) => {
	const fieldsRes: CollectionLeafFieldConfig[] = [];

	const fieldRecursive = (fields?: CollectionFieldConfig[]) => {
		if (!fields) return;
		for (const field of fields) {
			if (isStructuralField(field)) {
				fieldRecursive(field.fields);
				continue;
			}
			if (field.type === "repeater") continue;
			if (field.type === "color") continue;
			if (!isFieldTypeFilterable(field.type)) continue;

			fieldsRes.push(field);
		}
	};
	fieldRecursive(collection?.fields);

	return fieldsRes;
};

/** Returns listed top-level fields that can be sorted by stored value. */
export const collectionFieldSorts = (collection?: Collection) => {
	const sortsRes: Array<{ label: string; key: string }> = [];

	const fieldRecursive = (fields?: CollectionFieldConfig[]) => {
		if (!fields) return;
		for (const field of fields) {
			if (isStructuralField(field)) {
				fieldRecursive(field.fields);
				continue;
			}
			if (!isFieldTypeSortable(field.type)) continue;
			if (!collection?.listing.includes(field.key)) continue;

			sortsRes.push({
				label:
					helpers.getLocaleValue({
						value: field.details.label,
						fallback: field.key,
					}) || field.key,
				key: formatFieldFilters({ fieldKey: field.key }),
			});
		}
	};
	fieldRecursive(collection?.fields);

	return sortsRes;
};

/**
 * Formats fields ready for filter query params. Fields are all prefixed with an underscore. Brick and repeaters are seperated with a . and must be followed with a field key (_fieldKey).
 *
 * _${fieldKey}
 * ${brickKey}.${repeaterKey}._${fieldKey}
 */
export const formatFieldFilters = (props: { fieldKey: string }) => {
	return `_${props.fieldKey}`;
};

export const collectionFieldIncludes = (collection?: Collection) => {
	const fieldsRes: CollectionLeafFieldConfig[] = [];

	const fieldRecursive = (fields?: CollectionFieldConfig[]) => {
		if (!fields) return;
		for (const field of fields) {
			if (
				field.type === "repeater" ||
				field.type === "tab" ||
				field.type === "section" ||
				field.type === "collapsible"
			) {
				fieldRecursive(field.fields);
				continue;
			}
			if (collection?.listing.includes(field.key)) {
				fieldsRes.push(field);
			}
		}
	};
	fieldRecursive(collection?.fields);

	return fieldsRes;
};

const documentListingRefFieldTypes = ["media", "relation", "user"] as const;
type DocumentListingRefFieldType =
	(typeof documentListingRefFieldTypes)[number];
export type DocumentListingRefInclude = `refs.${DocumentListingRefFieldType}`;

/**
 * Enables typed ref includes only for listed field types whose table cells need
 * hydrated ref data to render labels/previews.
 */
export const documentListingRefIncludes = (
	fields: CollectionLeafFieldConfig[],
): Record<DocumentListingRefInclude, boolean> => {
	const fieldTypes = new Set(fields.map((field) => field.type));

	return documentListingRefFieldTypes.reduce(
		(includes, fieldType) => {
			includes[`refs.${fieldType}`] = fieldTypes.has(fieldType);
			return includes;
		},
		{} as Record<DocumentListingRefInclude, boolean>,
	);
};

const labelFieldTypes = new Set<CollectionLeafFieldConfig["type"]>([
	"text",
	"textarea",
	"select",
	"number",
	"datetime",
	"color",
]);

/** Limits labels to scalar fields we can render without extra document fetches. */
const isLabelField = (
	field: CollectionFieldConfig,
): field is CollectionLeafFieldConfig => {
	if (
		field.type === "repeater" ||
		field.type === "tab" ||
		field.type === "section" ||
		field.type === "collapsible"
	) {
		return false;
	}

	return labelFieldTypes.has(field.type);
};

/** Returns direct label-capable fields; tabs are UI-only, nested fields are skipped. */
const collectionDirectLabelFields = (collection?: Collection) => {
	const fieldsRes: CollectionLeafFieldConfig[] = [];

	const fieldRecursive = (fields?: CollectionFieldConfig[]) => {
		if (!fields) return;
		for (const field of fields) {
			if (field.type === "tab") {
				fieldRecursive(field.fields);
				continue;
			}
			if (isStructuralField(field) || field.type === "repeater") continue;
			if (isLabelField(field)) fieldsRes.push(field);
		}
	};
	fieldRecursive(collection?.fields);

	return fieldsRes;
};

/** Orders document label candidates by useAsLabel fields, listed fields, then fallback fields. */
const getDocumentPreviewFieldCandidates = (collection?: Collection) => {
	const directFields = collectionDirectLabelFields(collection);
	const labelFields = (collection?.labelFields ?? [])
		.map((fieldKey) => directFields.find((field) => field.key === fieldKey))
		.filter((field): field is CollectionLeafFieldConfig => field !== undefined);
	const listedFields = directFields.filter((field) =>
		collection?.listing.includes(field.key),
	);
	const candidates = [...labelFields, ...listedFields, ...directFields];
	const seen = new Set<string>();

	return candidates.filter((field) => {
		if (seen.has(field.key)) return false;
		seen.add(field.key);
		return true;
	});
};

export interface DocumentListingPreviewField {
	key: string;
	label: string;
	value: string;
}

/** Formats datetime values consistently for list cells and document labels. */
export const formatDateTimeListValue = (
	value: string | number,
	time: boolean,
) => {
	const raw = String(value).trim();
	if (!raw) return null;

	return (
		dateHelpers.formatDate(raw, {
			includeTime: time,
			localDateOnly: time === false,
		}) || raw
	);
};

/** Builds secondary label fields shown beside document relation values. */
export const getDocumentListingPreviewFields = (props: {
	collection?: Collection;
	documentRef?: DocumentRef | InternalCollectionDocument;
	contentLocale: string;
}): Array<DocumentListingPreviewField> => {
	const collection = props.collection;
	if (!collection || !props.documentRef?.fields) return [];
	const fields = getDocumentFields(props.documentRef);

	return getDocumentPreviewFieldCandidates(collection)
		.map((field) => {
			const documentField = findDocumentField({
				fields,
				fieldKey: field.key,
				fieldType: field.type,
			});
			const value = formatDocumentFieldValue({
				fieldConfig: field,
				fieldData: documentField,
				contentLocale: props.contentLocale,
				collectionLocalized: collection.localized,
			});

			if (!value) return null;

			return {
				key: field.key,
				label:
					helpers.getLocaleValue({
						value: field.details.label,
						fallback: field.key,
					}) || field.key,
				value,
			} satisfies DocumentListingPreviewField;
		})
		.filter((field): field is DocumentListingPreviewField => Boolean(field));
};

/** Resolves the main document label used by relation UI and listing fallbacks. */
export const getDocumentPreviewLabel = (props: {
	collection?: Collection;
	document?: DocumentRef | InternalCollectionDocument;
	contentLocale: string;
}) => {
	const collection = props.collection;
	const document = props.document;
	const fields = getDocumentFields(document);

	for (const field of getDocumentPreviewFieldCandidates(collection)) {
		const documentField = findDocumentField({
			fields,
			fieldKey: field.key,
			fieldType: field.type,
		});
		const value = formatDocumentFieldValue({
			fieldConfig: field,
			fieldData: documentField,
			contentLocale: props.contentLocale,
			collectionLocalized: collection?.localized ?? false,
		});

		if (value && value.trim().length > 0) return value;
	}

	const collectionName =
		helpers.getLocaleValue({
			value: collection?.details.singularName,
			fallback: collection?.key ?? document?.collectionKey,
		}) ||
		helpers.getLocaleValue({
			value: collection?.details.name,
			fallback: document?.collectionKey ?? T()("media.types.document"),
		}) ||
		T()("media.types.document");

	return `${collectionName} #${document?.id ?? "?"}`;
};

type DocumentFieldLike = DocumentField | InternalDocumentField;

/** Guards mixed API field payloads before recursive label lookups. */
const isDocumentField = (value: unknown): value is DocumentFieldLike => {
	return (
		isObjectRecord(value) &&
		typeof value.key === "string" &&
		typeof value.type === "string"
	);
};

/** Normalizes internal field arrays and ref field maps into one searchable list. */
const getDocumentFields = (
	document?: DocumentRef | InternalCollectionDocument,
): DocumentFieldLike[] => {
	const fields = document?.fields;
	if (!fields) return [];

	if (Array.isArray(fields)) {
		return fields.filter(isDocumentField);
	}

	if (!isObjectRecord(fields)) return [];

	return Object.entries(fields).flatMap(([key, field]) => {
		if (isDocumentField(field)) return [field];

		return [
			{
				key,
				type: "text",
				value: field,
			} satisfies InternalDocumentField,
		];
	});
};

/** Normalizes nested group fields so repeaters can be searched recursively. */
const getGroupFields = (
	groupFields:
		| Record<string, DocumentField>
		| Array<InternalDocumentField>
		| undefined,
) => {
	if (!groupFields) return [];
	if (Array.isArray(groupFields)) return groupFields.filter(isDocumentField);
	if (!isObjectRecord(groupFields)) return [];
	return Object.values(groupFields).filter(isDocumentField);
};

/** Finds a field by key across nested groups and applies the configured field type. */
const findDocumentField = (props: {
	fields: DocumentFieldLike[];
	fieldKey: string;
	fieldType: CollectionLeafFieldConfig["type"];
}): DocumentFieldLike | undefined => {
	for (const field of props.fields) {
		if (field.key === props.fieldKey) {
			if (field.type === props.fieldType) return field;
			return {
				...field,
				type: props.fieldType,
			};
		}

		for (const group of field.groups || []) {
			const nestedField = findDocumentField({
				fields: getGroupFields(group.fields),
				fieldKey: props.fieldKey,
				fieldType: props.fieldType,
			});
			if (nestedField) return nestedField;
		}
	}

	return undefined;
};

/** Reads localized values so labels match the active content locale. */
const getDocumentFieldValue = (props: {
	fieldConfig: CollectionLeafFieldConfig;
	fieldData?: DocumentField | InternalDocumentField;
	contentLocale: string;
	collectionLocalized: boolean;
}) => {
	if (!props.fieldData) return undefined;

	if (props.collectionLocalized && props.fieldConfig.localized === true) {
		return (
			props.fieldData.translations?.[props.contentLocale] ??
			props.fieldData.value
		);
	}

	return props.fieldData.value;
};

/** Formats document field values for compact table cells and relation labels. */
export const formatDocumentFieldValue = (props: {
	fieldConfig: CollectionLeafFieldConfig;
	fieldData?: DocumentField | InternalDocumentField;
	contentLocale: string;
	collectionLocalized: boolean;
}) => {
	const rawValue = getDocumentFieldValue(props);
	if (rawValue === null || rawValue === undefined) return null;

	switch (props.fieldConfig.type) {
		case "checkbox":
			return rawValue ? T()("common.yes") : T()("common.no");

		case "select": {
			const values = Array.isArray(rawValue) ? rawValue : [rawValue];
			const selectOptions =
				"options" in props.fieldConfig ? props.fieldConfig.options : [];
			const labels = values
				.map((value) => {
					const option = selectOptions.find(
						(opt: { value: string; label: unknown }) =>
							String(opt.value) === String(value),
					);
					if (!option) return String(value);

					return (
						helpers.getLocaleValue({
							value: option.label,
							fallback: String(option.value),
						}) || String(option.value)
					);
				})
				.filter(Boolean);

			return labels.length ? labels.join(", ") : null;
		}

		case "link": {
			if (typeof rawValue !== "object" || rawValue === null) {
				return String(rawValue);
			}

			const value = rawValue as { label?: string | null; url?: string | null };
			return value.label || value.url || null;
		}

		case "user":
		case "media":
		case "relation":
			return String(rawValue);

		case "textarea":
		case "text":
		case "number":
		case "color":
			return typeof rawValue === "string" || typeof rawValue === "number"
				? String(rawValue)
				: null;
		case "datetime":
			return typeof rawValue === "string" || typeof rawValue === "number"
				? formatDateTimeListValue(rawValue, props.fieldConfig.time !== false)
				: null;

		case "json":
			try {
				return JSON.stringify(rawValue);
			} catch {
				return String(rawValue);
			}

		default:
			if (typeof rawValue === "string" || typeof rawValue === "number") {
				return String(rawValue);
			}

			if (Array.isArray(rawValue)) {
				return rawValue.map((item) => String(item)).join(", ");
			}

			return null;
	}
};
