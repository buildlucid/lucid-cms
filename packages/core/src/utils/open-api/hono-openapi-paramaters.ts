import type { DescribeRouteOptions } from "hono-openapi";
import type { OpenAPIV3 } from "openapi-types";
import z, { type ZodType } from "zod";
import { translateServer } from "../../libs/i18n/index.js";

/**
 * Used to construct paramaters JSON schema for OpenAPI
 */
const honoOpenAPIParamaters = (props: {
	headers?: {
		// undefine means dont include in the schema, boolean means required or not
		csrf?: boolean;
		authorization?: boolean;
	};
	params?: ZodType;
	query?: ZodType;
}) => {
	const paramaters: DescribeRouteOptions["parameters"] = [];

	if (props.headers?.csrf !== undefined) {
		paramaters.push({
			in: "header",
			name: "X-CSRF-Token",
			required: props.headers.csrf,
			description: translateServer("core.openapi.csrf.header.description"),
			schema: {
				type: "string",
			},
		});
	}
	if (props.headers?.authorization !== undefined) {
		paramaters.push({
			in: "header",
			name: "Authorization",
			required: props.headers.authorization,
			description: translateServer(
				"core.openapi.authorization.header.description",
			),
			schema: {
				type: "string",
			},
		});
	}

	if (props.params) {
		const paramsSchema = z.toJSONSchema(props.params) as OpenAPIV3.SchemaObject;
		if (paramsSchema.properties) {
			for (const [paramName, paramSchema] of Object.entries(
				paramsSchema.properties,
			)) {
				const schema = paramSchema as OpenAPIV3.SchemaObject;
				paramaters.push({
					name: paramName,
					in: "path",
					required: true,
					description: schema.description,
					example: schema.example,
				});
			}
		}
	}

	if (props.query) {
		const querySchema = z.toJSONSchema(props.query) as OpenAPIV3.SchemaObject;
		if (querySchema.properties) {
			for (const [paramName, paramSchema] of Object.entries(
				querySchema.properties,
			)) {
				const schema = paramSchema as OpenAPIV3.SchemaObject;
				paramaters.push({
					name: paramName,
					in: "query",
					required: querySchema.required?.includes(paramName),
					description: schema.description,
					example: schema.example,
				});
			}
		}
	}

	return paramaters;
};

export default honoOpenAPIParamaters;
