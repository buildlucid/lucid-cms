import type { RichTextJSON } from "@lucidcms/rich-text";
import type {
	CustomFieldGenerationFieldType,
	CustomFieldGenerationTarget,
} from "@/store/aiModalsStore";

/**
 * Provides the smallest valid rich-text document when AI returns an unusable value.
 */
export const createEmptyRichTextValue = (): RichTextJSON => ({
	type: "doc",
	content: [{ type: "paragraph" }],
});

/**
 * Keeps JSON field checks consistent across generation, editing, and validation state.
 */
export const isJsonField = (type?: CustomFieldGenerationFieldType) =>
	type === "json";

/**
 * Converts generated JSON values into stable editor text without crashing on circular input.
 */
export const stringifyJsonValue = (value: unknown) => {
	try {
		return JSON.stringify(value ?? {}, null, 2);
	} catch {
		return "{}";
	}
};

/**
 * Coerces AI output into the field shape expected by the matching preview editor.
 */
export const normalizeOutputValue = (
	type: CustomFieldGenerationFieldType | undefined,
	value: unknown,
) => {
	if (type === "text" || type === "textarea") {
		return typeof value === "string" ? value : String(value ?? "");
	}

	if (type === "rich-text") {
		return value && typeof value === "object"
			? value
			: createEmptyRichTextValue();
	}

	return value ?? {};
};

/**
 * Snapshots draft/original values so later edits do not mutate the saved baseline.
 */
export const cloneGenerationValue = <T>(value: T): T => {
	try {
		return structuredClone(value);
	} catch {
		try {
			return JSON.parse(JSON.stringify(value)) as T;
		} catch {
			return value;
		}
	}
};

/**
 * Builds the request value map, including source locale context for localized fields.
 */
export const createLocaleValueRecord = (props: {
	fieldLocalized: boolean;
	selectedLocales: string[];
	sourceLocale: string;
	values: Record<string, unknown>;
	target: CustomFieldGenerationTarget;
}): Record<string, unknown> => {
	const record = props.selectedLocales.reduce<Record<string, unknown>>(
		(accumulator, localeCode) => {
			const value = props.values[localeCode];
			if (value !== undefined) accumulator[localeCode] = value;
			return accumulator;
		},
		{},
	);

	if (props.fieldLocalized && !Object.hasOwn(record, props.sourceLocale)) {
		const sourceValue = props.target.value(props.sourceLocale);
		if (sourceValue !== undefined) {
			record[props.sourceLocale] = sourceValue;
		}
	}

	return record;
};
