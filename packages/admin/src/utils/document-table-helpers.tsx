import type {
	CFConfig,
	CollectionResponse,
	DocumentRef,
	FieldAltResponse,
	FieldTypes,
} from "@types";
import { FaSolidT, FaSolidUser } from "solid-icons/fa";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import helpers from "@/utils/helpers";

export const tableHeadColumns = (fields: CFConfig<FieldTypes>[]) => {
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

export const collectionFieldFilters = (collection?: CollectionResponse) => {
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

export const collectionFieldIncludes = (collection?: CollectionResponse) => {
	const fieldsRes: CFConfig<FieldTypes>[] = [];

	const fieldRecursive = (fields?: CFConfig<FieldTypes>[]) => {
		if (!fields) return;
		for (const field of fields) {
			if (field.type === "repeater" && field.fields) {
				fieldRecursive(field.fields);
				return;
			}
			if (collection?.config.displayInListing.includes(field.key)) {
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
	useTime: boolean,
) => {
	const raw = String(value).trim();
	if (!raw) return null;

	return (
		dateHelpers.formatDate(raw, {
			includeTime: useTime,
			localDateOnly: useTime === false,
		}) || raw
	);
};

export const getDocumentListingPreviewFields = (props: {
	collection?: CollectionResponse;
	documentRef?: DocumentRef;
	contentLocale: string;
}) => {
	const collection = props.collection;
	if (!collection || !props.documentRef?.fields) return [];

	return collectionFieldIncludes(collection)
		.map((field) => {
			if (field.type === "tab" || field.type === "repeater") return null;

			const documentField = findDocumentField({
				fields: props.documentRef?.fields || {},
				fieldKey: field.key,
			});
			const value = formatDocumentPreviewValue({
				fieldConfig: field,
				fieldData: documentField,
				contentLocale: props.contentLocale,
				collectionTranslations: collection.config.useTranslations,
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
	fields: Record<string, FieldAltResponse>;
	fieldKey: string;
}): FieldAltResponse | undefined => {
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
	fieldConfig: CFConfig<Exclude<FieldTypes, "repeater" | "tab">>;
	fieldData?: FieldAltResponse;
	contentLocale: string;
	collectionTranslations: boolean;
}) => {
	if (!props.fieldData) return undefined;

	if (
		props.collectionTranslations &&
		props.fieldConfig.config.useTranslations === true
	) {
		return (
			props.fieldData.translations?.[props.contentLocale] ??
			props.fieldData.value
		);
	}

	return props.fieldData.value;
};

const formatDocumentPreviewValue = (props: {
	fieldConfig: CFConfig<Exclude<FieldTypes, "repeater" | "tab">>;
	fieldData?: FieldAltResponse;
	contentLocale: string;
	collectionTranslations: boolean;
}) => {
	const rawValue = getDocumentFieldValue(props);
	if (rawValue === null || rawValue === undefined) return null;

	switch (props.fieldConfig.type) {
		case "checkbox":
			return rawValue ? T()("yes") : T()("no");

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
						props.fieldConfig.config.useTime !== false,
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
