import type {
	CustomFieldGenerationFieldType,
	CustomFieldGenerationTarget,
} from "@/store/aiModalsStore";
import { createEmptyRichTextValue } from "@/utils/rich-text";

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

export type CodeFieldGenerationValue = {
	language: string;
	value: string;
} | null;

/**
 * Coerces a draft value into the code field `{ language, value }` shape.
 */
export const getCodeDraftValue = (value: unknown): CodeFieldGenerationValue => {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;

	const code = value as Record<string, unknown>;
	if (typeof code.value !== "string") return null;

	return {
		language: typeof code.language === "string" ? code.language : "text",
		value: code.value,
	};
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

	if (type === "code") {
		const codeValue = getCodeDraftValue(value);
		if (codeValue) return codeValue;
		if (typeof value === "string" && value.trim() !== "") {
			return { language: "text", value };
		}
		return null;
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
