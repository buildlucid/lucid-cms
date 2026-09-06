import type { OpenAPIV3 } from "openapi-types";
import z, { type ZodType } from "zod";

/** Describes an application/json request body using a Zod schema. */
const requestBody = (schema: ZodType): OpenAPIV3.RequestBodyObject => {
	return {
		content: {
			"application/json": {
				schema: z.toJSONSchema(schema) as OpenAPIV3.SchemaObject,
			},
		},
	};
};

export default requestBody;
