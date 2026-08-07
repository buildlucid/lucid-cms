import type { FieldInputSchema } from "@lucidcms/core/types";
import constants from "../../../constants.js";

const COPY_SUFFIX = /^(.*)-copy(?:-(\d+))?$/;
const ROOT_COPY_SUFFIX = /^copy(?:-(\d+))?$/;

/** Returns the next copy candidate while preserving an existing copy sequence. */
export const getDuplicateSlugCandidate = (
	value: unknown,
	attempt: number,
): unknown => {
	if (attempt < 1 || typeof value !== "string") return value;

	if (value === "/" || value.length === 0) {
		return attempt === 1 ? "copy" : `copy-${attempt}`;
	}

	const rootMatch = value.match(ROOT_COPY_SUFFIX);
	if (rootMatch) {
		const existingSequence = Number.parseInt(rootMatch[1] ?? "1", 10);
		return `copy-${existingSequence + attempt}`;
	}

	const match = value.match(COPY_SUFFIX);
	const base = match?.[1] ?? value;
	const existingSequence = match ? Number.parseInt(match[2] ?? "1", 10) : 0;
	const sequence = existingSequence + attempt;

	return sequence === 1 ? `${base}-copy` : `${base}-copy-${sequence}`;
};

/** Captures the original slug values so retries always use the same source. */
export const getDuplicateSlugSource = (field: FieldInputSchema) => ({
	value: field.value,
	translations: field.translations
		? { ...field.translations }
		: field.translations,
});

/** Applies a copy suffix candidate to every stored slug value. */
export const applyDuplicateSlugCandidate = (
	field: FieldInputSchema,
	source: ReturnType<typeof getDuplicateSlugSource>,
	attempt: number,
) => {
	if (source.value !== undefined) {
		field.value = getDuplicateSlugCandidate(source.value, attempt);
	}

	if (source.translations) {
		field.translations = Object.fromEntries(
			Object.entries(source.translations).map(([locale, value]) => [
				locale,
				getDuplicateSlugCandidate(value, attempt),
			]),
		);
	}
};

/** Returns true when an error only contains retryable slug collisions. */
export const isFullSlugCollisionError = (error: {
	status?: number;
	errors?: Record<string, unknown>;
}) => {
	const fields = error.errors?.fields;
	if (error.status !== 400 || !Array.isArray(fields) || fields.length === 0) {
		return false;
	}

	return fields.every(
		(field) =>
			typeof field === "object" &&
			field !== null &&
			"key" in field &&
			field.key === constants.fields.slug.key,
	);
};
