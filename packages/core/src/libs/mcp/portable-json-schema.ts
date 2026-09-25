import isPlainObject from "../../utils/helpers/is-plain-object.js";

/** Keywords whose values are maps of named subschemas. */
const schemaMapKeywords = new Set([
	"$defs",
	"definitions",
	"properties",
	"patternProperties",
	"dependentSchemas",
]);

/** Keywords whose values are data rather than schemas. */
const dataKeywords = new Set(["const", "default", "enum", "examples"]);

const isEmptySchema = (value: unknown) =>
	isPlainObject(value) && Object.keys(value).length === 0;

const toPortableValue = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(toPortableValue);
	return isPlainObject(value) ? toPortableJsonSchema(value) : value;
};

/**
 * Respells a JSON Schema for MCP clients that map tool schemas onto narrower
 * dialects. `type` arrays become single-type `anyOf` branches, empty
 * `additionalProperties` become `true` and empty `items` are omitted. All are
 * equivalent in JSON Schema.
 */
export const toPortableJsonSchema = (
	schema: Record<PropertyKey, unknown>,
): Record<string, unknown> => {
	const portable: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(schema)) {
		if (key === "type" && Array.isArray(value)) {
			portable.anyOf = value.map((type) => ({ type }));
		} else if (key === "additionalProperties" && isEmptySchema(value)) {
			portable[key] = true;
		} else if (key === "items" && isEmptySchema(value)) {
			// An absent `items` allows any item, and bare `true` is not accepted here.
		} else if (schemaMapKeywords.has(key) && isPlainObject(value)) {
			portable[key] = Object.fromEntries(
				Object.entries(value).map(([name, child]) => [
					name,
					toPortableValue(child),
				]),
			);
		} else {
			portable[key] = dataKeywords.has(key) ? value : toPortableValue(value);
		}
	}

	return portable;
};
