import type { OpenAPIV3 } from "openapi-types";
import z, { type ZodType } from "zod";

/**
 * Converts a Zod schema to the OpenAPI schema type expected by hono-openapi.
 */
const schema = (value: ZodType) =>
	z.toJSONSchema(value) as OpenAPIV3.SchemaObject;

export default schema;
