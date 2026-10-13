import { userPreferencesSchema } from "../../../schemas/users.js";
import type { UserPreferences } from "../../../types/response.js";
import isPlainObject from "../../../utils/helpers/is-plain-object.js";

/**
 * Keeps each stored preference that still matches the current schema. A key
 * that was renamed or changed shape is dropped, so it falls back to its default
 * without affecting the others.
 */
const parseUserPreferences = (value: unknown): UserPreferences => {
	if (!isPlainObject(value)) return {};

	const valid: Record<string, unknown> = {};
	for (const [key, schema] of Object.entries(userPreferencesSchema.shape)) {
		const result = schema.safeParse(value[key]);
		if (result.success && result.data !== undefined) valid[key] = result.data;
	}

	return userPreferencesSchema.parse(valid);
};

export default parseUserPreferences;
