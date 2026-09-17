import { translateAdminCopy } from "@/translations";
import { LucidError } from "./error-handling";

/**
 * Returns a field error message, or undefined when there is none.
 *
 * @example
 * ```ts
 * import { getFieldError } from "@lucidcms/admin/utils";
 *
 * const titleError = getFieldError(error, "title");
 * ```
 */
export const getFieldError = (
	error: unknown,
	field?: string,
): string | undefined => {
	if (error instanceof LucidError) return getFieldError(error.errorRes, field);
	if (typeof error === "string") return error;
	if (!error || typeof error !== "object") return undefined;

	if (field !== undefined) {
		if (
			!("errors" in error) ||
			!error.errors ||
			typeof error.errors !== "object"
		) {
			return undefined;
		}

		const entry = Object.entries(error.errors).find(([key]) => key === field);

		return getFieldError(entry?.[1]);
	}

	if (Array.isArray(error)) {
		return (
			error
				.map((item: unknown) => getFieldError(item))
				.filter(Boolean)
				.join("\n") || undefined
		);
	}

	if ("message" in error) return getFieldError(error.message);

	const values: Record<string, string | number | undefined> = {};
	if ("values" in error && error.values && typeof error.values === "object") {
		for (const [key, value] of Object.entries(error.values)) {
			if (typeof value === "string" || typeof value === "number") {
				values[key] = value;
			}
		}
	}

	if (
		"type" in error &&
		error.type === "lucid.literal" &&
		"value" in error &&
		typeof error.value === "string"
	) {
		return translateAdminCopy({
			type: "lucid.literal",
			value: error.value,
			values,
		});
	}

	if (
		"type" in error &&
		error.type === "lucid.copy" &&
		"key" in error &&
		typeof error.key === "string"
	) {
		return translateAdminCopy({
			type: "lucid.copy",
			scope: "admin",
			key: error.key,
			values,
			defaultMessage:
				"defaultMessage" in error && typeof error.defaultMessage === "string"
					? error.defaultMessage
					: undefined,
		});
	}

	return undefined;
};
