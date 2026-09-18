import type { FieldError, InternalDocumentField } from "@types";
import type { CollectionFieldConfig } from "@/types/collection-config";
import { getFieldError } from "@/utils/get-field-error";
import { flattenStructuralScopeConfigs } from "@/utils/structural-field-helpers";
import type {
	EditorContext,
	EditorFieldConfig,
	EditorFieldState,
} from "./types";

export const readFieldValue = (
	config: EditorFieldConfig,
	data: InternalDocumentField | undefined,
	contentLocale: string,
	localized: boolean,
) =>
	"localized" in config && config.localized && localized
		? data?.translations?.[contentLocale]
		: data?.value;

/** Resolves the configured route from live collection fields, without locale fallback. */
export const readDocumentRoute = (options: {
	field: string | undefined;
	configs: CollectionFieldConfig[];
	fields: InternalDocumentField[];
	contentLocale: string;
	localized: boolean;
}): EditorContext["route"] => {
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

/** Reads a field value in the current content locale. */
export const createFieldState = (options: {
	config: EditorFieldConfig;
	data?: InternalDocumentField;
	errors?: FieldError[];
	contentLocale: string;
	localized: boolean;
	readOnly: boolean;
}): EditorFieldState => {
	const { config, data } = options;
	const value = readFieldValue(
		config,
		data,
		options.contentLocale,
		options.localized,
	);

	const common = {
		key: config.key,
		config,
		errors: (options.errors ?? [])
			.filter(
				(error) =>
					error.key === config.key &&
					(error.localeCode === null ||
						error.localeCode === options.contentLocale),
			)
			.flatMap((error) => {
				const message = getFieldError(error);
				return message ? [message] : [];
			}),
		readOnly: options.readOnly || config.ui?.disabled === true,
	};

	switch (config.type) {
		case "text":
		case "textarea":
		case "select":
		case "color":
		case "datetime":
			return {
				...common,
				type: config.type,
				value: typeof value === "string" ? value : undefined,
			};
		case "number":
			return {
				...common,
				type: config.type,
				value: typeof value === "number" || value === null ? value : undefined,
			};
		case "checkbox":
			return {
				...common,
				type: config.type,
				value: typeof value === "boolean" ? value : undefined,
			};
		case "repeater":
			return {
				...common,
				type: config.type,
				groups: (data?.groups ?? []).map((group) => ({
					ref: group.ref,
					fields: createFieldStates({
						...options,
						configs: config.fields,
						fields: group.fields,
						errors: options.errors
							?.find((error) => error.key === config.key)
							?.groupErrors?.find((error) => error.ref === group.ref)?.fields,
					}),
				})),
			};
		default:
			return { ...common, type: config.type, value };
	}
};

export const createFieldStates = (options: {
	configs: CollectionFieldConfig[];
	fields: InternalDocumentField[];
	errors?: FieldError[];
	contentLocale: string;
	localized: boolean;
	readOnly: boolean;
}): EditorFieldState[] =>
	flattenStructuralScopeConfigs(options.configs).map((config) =>
		createFieldState({
			...options,
			config,
			data: options.fields.find((field) => field.key === config.key),
		}),
	);
