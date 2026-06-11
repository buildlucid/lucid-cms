import type { AdminCopyDescriptor } from "./types.js";

type AdminTranslationBundle = Record<string, string>;

/**
 * Only hydrate response-shaped objects so builders, classes, and other runtime
 * instances keep their identity.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (value === null || typeof value !== "object") return false;

	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};

/**
 * Detects admin copy descriptors by their transport shape before adding
 * fallback copy.
 */
const isAdminCopyDescriptor = (
	value: Record<string, unknown>,
): value is AdminCopyDescriptor => {
	return (
		value.type === "lucid.copy" &&
		value.scope === "admin" &&
		typeof value.key === "string"
	);
};

/**
 * Recursively clones only the branches that need hydrated admin copy.
 */
const hydrateValue = (
	value: unknown,
	adminTranslations: AdminTranslationBundle,
): unknown => {
	if (Array.isArray(value)) {
		let changed = false;
		const hydratedItems = value.map((item) => {
			const hydratedItem = hydrateValue(item, adminTranslations);
			if (hydratedItem !== item) changed = true;
			return hydratedItem;
		});

		return changed ? hydratedItems : value;
	}

	if (!isPlainObject(value)) return value;

	if (isAdminCopyDescriptor(value)) {
		if (value.defaultMessage !== undefined) return value;
		if (!Object.hasOwn(adminTranslations, value.key)) return value;

		const defaultMessage = adminTranslations[value.key];
		if (defaultMessage === undefined) return value;

		return {
			...value,
			defaultMessage,
		};
	}

	let changed = false;
	const hydratedEntries = Object.entries(value).map(([key, entryValue]) => {
		const hydratedEntryValue = hydrateValue(entryValue, adminTranslations);
		if (hydratedEntryValue !== entryValue) changed = true;
		return [key, hydratedEntryValue] as const;
	});

	return changed ? Object.fromEntries(hydratedEntries) : value;
};

/**
 * Adds `defaultMessage` values to admin copy descriptors from an admin
 * translation bundle.
 *
 * Use this before returning descriptors across API or plugin boundaries so
 * consumers have stable fallback text while their own translations load. It
 * preserves explicit defaults and leaves missing keys untouched.
 *
 * @example
 * ```ts
 * import { copy, hydrateAdminCopyDefaults } from "@lucidcms/core/plugin";
 *
 * const details = hydrateAdminCopyDefaults(
 *   { name: copy("admin:collections.blog.name") },
 *   { "collections.blog.name": "Blog" },
 * );
 * ```
 */
export const hydrateAdminCopyDefaults = <T>(
	value: T,
	adminTranslations?: AdminTranslationBundle,
): T => {
	if (!adminTranslations) return value;

	return hydrateValue(value, adminTranslations) as T;
};
