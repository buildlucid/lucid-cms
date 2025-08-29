import z, { type ZodType } from "zod/v4";
import type { OpenAPIV3 } from "openapi-types";

const honoOpenAPIRequestBody = (
	schema: ZodType,
): OpenAPIV3.RequestBodyObject => {
	return {
		content: {
			"application/json": {
				schema: z.toJSONSchema(schema) as OpenAPIV3.SchemaObject,
			},
		},
	};
};

export default honoOpenAPIRequestBody;
