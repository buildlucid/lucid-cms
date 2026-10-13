import isPlainObject from "../../utils/helpers/is-plain-object.js";

type JsonSchema = Record<string, unknown>;

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

const acceptsNull = (schema: JsonSchema): boolean =>
	schema.type === "null" ||
	(Array.isArray(schema.type) && schema.type.includes("null")) ||
	(Array.isArray(schema.anyOf) &&
		schema.anyOf.some(
			(branch) => isPlainObject(branch) && acceptsNull(branch),
		));

const allowNull = ({ description, ...schema }: JsonSchema) => ({
	...(description === undefined ? {} : { description }),
	anyOf: [schema, { type: "null" }],
});

const allowValueNulls = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(allowValueNulls);
	return isPlainObject(value) ? allowOptionalNulls(value) : value;
};

/**
 * Allows null for optional JSON Schema properties recursively.
 * @remarks Transforms the finished schema because Zod may repeat metadata override calls.
 * `prepareToolInput` removes nulls rejected by the input schema.
 */
const allowOptionalNulls = (schema: JsonSchema): JsonSchema => {
	const required = Array.isArray(schema.required) ? schema.required : [];
	const result: JsonSchema = {};
	for (const [key, value] of Object.entries(schema)) {
		if (schemaMapKeywords.has(key) && isPlainObject(value)) {
			result[key] = Object.fromEntries(
				Object.entries(value).map(([name, child]) => {
					const property = allowValueNulls(child);
					return key === "properties" &&
						!required.includes(name) &&
						isPlainObject(property) &&
						!acceptsNull(property)
						? [name, allowNull(property)]
						: [name, property];
				}),
			);
		} else {
			result[key] = dataKeywords.has(key) ? value : allowValueNulls(value);
		}
	}

	return result;
};

export default allowOptionalNulls;
