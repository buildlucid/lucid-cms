import z, { type ZodType } from "zod/v4";
import T from "../../translations/index.js";
import type { DescribeRouteOptions } from "hono-openapi";
import type { OpenAPIV3 } from "openapi-types";

/**
 * Used to construct paramaters JSON schema for Swagger
 */
const honoSwaggerParamaters = (props: {
	headers?: {
		// undefine means dont include in the schema, boolean means required or not
		csrf?: boolean;
		contentLocale?: boolean;
		clientKey?: boolean;
		authorization?: boolean;
	};
	params?: ZodType;
	query?: ZodType;
}) => {
	const paramaters: DescribeRouteOptions["parameters"] = [];

	if (props.headers?.csrf !== undefined) {
		paramaters.push({
			in: "header",
			name: "_csrf",
			required: props.headers.csrf,
			description: T("swagger_csrf_header_description"),
			schema: {
				type: "string",
			},
		});
	}
	if (props.headers?.contentLocale !== undefined) {
		paramaters.push({
			in: "header",
			name: "lucid-content-locale",
			required: props.headers.contentLocale,
			description: T("swagger_content_locale_header_description"),
			example: "en",
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
			description: T("swagger_authorization_header_description"),
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

export default honoSwaggerParamaters;
