import type { InternalDocumentField } from "@types";
import { isRecord } from "@/preview/protocol/utils/validation";
import type { CollectionFieldConfig } from "@/types/collection-config";
import { flattenStructuralScopeConfigs } from "@/utils/structural-field-helpers";
import type {
	DocumentEditor,
	EditorFieldConfig,
	FieldState,
	FieldValueByType,
	ValueFieldType,
} from "./types";

const isText = (value: unknown): value is string | null =>
	value === null || typeof value === "string";
const isIds = (value: unknown): value is number[] =>
	Array.isArray(value) && value.every((item) => typeof item === "number");

/** Validates stored values against their field type. */
export const isFieldValue: {
	[Type in ValueFieldType]: (value: unknown) => value is FieldValueByType[Type];
} = {
	text: isText,
	textarea: isText,
	select: isText,
	color: isText,
	datetime: isText,
	number: (value) => value === null || typeof value === "number",
	range: isIds,
	checkbox: (value) => value === null || typeof value === "boolean",
	json: (value): value is FieldValueByType["json"] =>
		value === null || typeof value === "object",
	code: (value): value is FieldValueByType["code"] =>
		value === null ||
		(isRecord(value) &&
			typeof value.language === "string" &&
			typeof value.value === "string"),
	link: (value): value is FieldValueByType["link"] =>
		value === null ||
		(isRecord(value) &&
			isText(value.url) &&
			isText(value.target) &&
			isText(value.label)),
	"rich-text": (value): value is FieldValueByType["rich-text"] =>
		value === null || isRecord(value),
	media: isIds,
	user: isIds,
	email: isIds,
	relation: (value): value is FieldValueByType["relation"] =>
		Array.isArray(value) &&
		value.every(
			(item) =>
				isRecord(item) &&
				typeof item.id === "number" &&
				typeof item.collectionKey === "string",
		),
};

/** Reads the stored value in the content locale, or the shared value when the field or collection isn't localized. */
export const readFieldValue = (
	config: EditorFieldConfig,
	data: InternalDocumentField | undefined,
	contentLocale: string,
	localized: boolean,
) =>
	"localized" in config && config.localized && localized
		? data?.translations?.[contentLocale]
		: data?.value;

/** Narrows a stored value to its field type, or undefined when it's missing or has another shape. */
export const readTypedValue = <TType extends ValueFieldType>(
	type: TType,
	value: unknown,
): FieldValueByType[TType] | undefined =>
	isFieldValue[type](value) ? value : undefined;

/** Resolves the configured route from live collection fields, without locale fallback. */
export const readDocumentRoute = (options: {
	field: string | undefined;
	configs: CollectionFieldConfig[];
	fields: InternalDocumentField[];
	contentLocale: string;
	localized: boolean;
}): DocumentEditor["route"] => {
	if (!options.field) return undefined;

	const config = flattenStructuralScopeConfigs(options.configs).find(
		(config) => config.key === options.field,
	);
	const value = config
		? readFieldValue(
				config,
				options.fields.find((field) => field.key === options.field),
				options.contentLocale,
				options.localized,
			)
		: undefined;

	return {
		field: options.field,
		path: typeof value === "string" ? value : undefined,
	};
};

/** Reads a listed document's field in the current content locale. */
export const createFieldState = (options: {
	config: EditorFieldConfig;
	data?: InternalDocumentField;
	contentLocale: string;
	localized: boolean;
}): FieldState => {
	const { config } = options;

	//* type, config and value come from the same config, which TypeScript can't correlate across the union
	return {
		key: config.key,
		type: config.type,
		config,
		value:
			config.type === "repeater"
				? undefined
				: readTypedValue(
						config.type,
						readFieldValue(
							config,
							options.data,
							options.contentLocale,
							options.localized,
						),
					),
	} as FieldState;
};
