import type { Collection, DocumentField, DocumentRef } from "@types";
import { FaSolidT, FaSolidUser } from "solid-icons/fa";
import T from "@/translations";
import type {
	CollectionFieldConfig,
	CollectionLeafFieldConfig,
} from "@/types/collection-config";
import dateHelpers from "@/utils/date-helpers";
import helpers from "@/utils/helpers";

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

export const collectionFieldFilters = (collection?: Collection) => {
	return (
		collection?.fields.filter((f) => {
			return f.type !== "repeater";
		}) || []
	);
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
			if (field.type === "repeater") {
				fieldRecursive(field.fields);
				continue;
			}
			if (field.type === "tab") {
				fieldRecursive(field.fields);
				continue;
			}
			if (collection?.features.listing.includes(field.key)) {
				fieldsRes.push(field);
			}
		}
	};
	fieldRecursive(collection?.fields);

	return fieldsRes;
};

export interface DocumentListingPreviewField {
	key: string;
	label: string;
	value: string;
}

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

export const getDocumentListingPreviewFields = (props: {
	collection?: Collection;
	documentRef?: DocumentRef;
	contentLocale: string;
}): Array<DocumentListingPreviewField> => {
	const collection = props.collection;
	if (!collection || !props.documentRef?.fields) return [];

	return collectionFieldIncludes(collection)
		.map((field) => {
			const documentField = findDocumentField({
				fields: props.documentRef?.fields || {},
				fieldKey: field.key,
			});
			const value = formatDocumentPreviewValue({
				fieldConfig: field,
				fieldData: documentField,
				contentLocale: props.contentLocale,
				collectionLocalized: collection.features.localized,
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

const findDocumentField = (props: {
	fields: Record<string, DocumentField>;
	fieldKey: string;
}): DocumentField | undefined => {
	for (const field of Object.values(props.fields)) {
		if (field.key === props.fieldKey) return field;

		for (const group of field.groups || []) {
			const nestedField = findDocumentField({
				fields: group.fields,
				fieldKey: props.fieldKey,
			});
			if (nestedField) return nestedField;
		}
	}

	return undefined;
};

const getDocumentFieldValue = (props: {
	fieldConfig: CollectionLeafFieldConfig;
	fieldData?: DocumentField;
	contentLocale: string;
	collectionLocalized: boolean;
}) => {
	if (!props.fieldData) return undefined;

	if (
		props.collectionLocalized &&
		props.fieldConfig.config.localized === true
	) {
		return (
			props.fieldData.translations?.[props.contentLocale] ??
			props.fieldData.value
		);
	}

	return props.fieldData.value;
};

const formatDocumentPreviewValue = (props: {
	fieldConfig: CollectionLeafFieldConfig;
	fieldData?: DocumentField;
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
		case "document":
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
				? formatDateTimeListValue(
						rawValue,
						props.fieldConfig.config.time !== false,
					)
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
